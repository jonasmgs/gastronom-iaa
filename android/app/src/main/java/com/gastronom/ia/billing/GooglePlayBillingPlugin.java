package com.gastronom.ia.billing;

import android.content.Intent;
import android.net.Uri;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.AcknowledgePurchaseResponseListener;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(name = "GooglePlayBilling")
public class GooglePlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private static final String EVENT_PURCHASE_UPDATED = "purchaseUpdated";

    private BillingClient billingClient;
    private boolean isConnecting = false;
    private final Object connectionLock = new Object();
    private final List<PendingAction> pendingActions = new ArrayList<>();

    private interface BillingAction {
        void run(BillingClient client);
    }

    private interface ProductDetailsCallback {
        void onResult(ProductDetails productDetails);
    }

    private static final class PendingAction {
        final PluginCall call;
        final BillingAction action;

        PendingAction(PluginCall call, BillingAction action) {
            this.call = call;
            this.action = action;
        }
    }

    @Override
    public void load() {
        super.load();
        billingClient = BillingClient.newBuilder(getContext()).setListener(this).enablePendingPurchases().build();
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null) {
            billingClient.endConnection();
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        withReadyClient(call, client -> {
            JSObject result = new JSObject();
            result.put("available", true);
            result.put("ready", client.isReady());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void getProductDetails(PluginCall call) {
        final String productId = requireProductId(call);
        if (productId == null) {
            return;
        }

        withReadyClient(call, client -> queryProductDetails(client, productId, call, productDetails -> {
            call.resolve(buildProductDetailsResult(productDetails));
        }));
    }

    @PluginMethod
    public void getSubscriptionStatus(PluginCall call) {
        final String productId = requireProductId(call);
        if (productId == null) {
            return;
        }

        withReadyClient(call, client -> {
            QueryPurchasesParams params = QueryPurchasesParams
                .newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

            client.queryPurchasesAsync(params, (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(buildBillingMessage(billingResult, "Nao foi possivel consultar a assinatura do Google Play."));
                    return;
                }

                Purchase purchase = findPurchaseForProduct(purchases, productId);
                if (purchase == null) {
                    JSObject result = buildInactiveSubscriptionResult(productId);
                    call.resolve(result);
                    return;
                }

                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged()) {
                    acknowledgePurchase(client, purchase, billingAckResult -> {
                        if (billingAckResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                            call.reject(buildBillingMessage(billingAckResult, "A compra foi concluida, mas nao foi possivel confirmar a assinatura."));
                            return;
                        }

                        call.resolve(buildSubscriptionResult(purchase, productId));
                    });
                    return;
                }

                call.resolve(buildSubscriptionResult(purchase, productId));
            });
        });
    }

    @PluginMethod
    public void purchaseSubscription(PluginCall call) {
        final String productId = requireProductId(call);
        if (productId == null) {
            return;
        }

        withReadyClient(call, client -> queryProductDetails(client, productId, call, productDetails -> {
            ProductDetails.SubscriptionOfferDetails offerDetails = getDefaultOfferDetails(productDetails);
            if (offerDetails == null) {
                call.reject("Nenhuma oferta ativa foi encontrada para esta assinatura no Google Play.");
                return;
            }

            if (getActivity() == null) {
                call.reject("A tela de compra do Google Play nao esta disponivel agora.");
                return;
            }

            BillingFlowParams.ProductDetailsParams productDetailsParams = BillingFlowParams.ProductDetailsParams
                .newBuilder()
                .setProductDetails(productDetails)
                .setOfferToken(offerDetails.getOfferToken())
                .build();

            List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
            productDetailsParamsList.add(productDetailsParams);

            BillingFlowParams billingFlowParams = BillingFlowParams
                .newBuilder()
                .setProductDetailsParamsList(productDetailsParamsList)
                .build();

            BillingResult billingResult = client.launchBillingFlow(getActivity(), billingFlowParams);
            int responseCode = billingResult.getResponseCode();

            if (responseCode == BillingClient.BillingResponseCode.OK) {
                JSObject result = new JSObject();
                result.put("started", true);
                result.put("productId", productId);
                call.resolve(result);
                return;
            }

            if (responseCode == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
                emitCurrentSubscriptionState(client, productId);
                JSObject result = new JSObject();
                result.put("started", false);
                result.put("alreadyOwned", true);
                result.put("productId", productId);
                call.resolve(result);
                return;
            }

            if (responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
                call.reject("Compra cancelada.");
                return;
            }

            call.reject(buildBillingMessage(billingResult, "Nao foi possivel iniciar o pagamento no Google Play."));
        }));
    }

    @PluginMethod
    public void openManageSubscriptions(PluginCall call) {
        String productId = call.getString("productId");
        Uri.Builder uriBuilder = Uri
            .parse("https://play.google.com/store/account/subscriptions")
            .buildUpon()
            .appendQueryParameter("package", getContext().getPackageName());

        if (productId != null && !productId.trim().isEmpty()) {
            uriBuilder.appendQueryParameter("sku", productId.trim());
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, uriBuilder.build());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        int responseCode = billingResult.getResponseCode();

        if (responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            if (purchases.isEmpty()) {
                notifyListeners(EVENT_PURCHASE_UPDATED, buildPurchaseEvent("cancelled", null, "Compra cancelada."));
                return;
            }

            for (Purchase purchase : purchases) {
                handlePurchaseUpdate(purchase);
            }
            return;
        }

        if (responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            notifyListeners(EVENT_PURCHASE_UPDATED, buildPurchaseEvent("cancelled", null, "Compra cancelada."));
            return;
        }

        notifyListeners(
            EVENT_PURCHASE_UPDATED,
            buildPurchaseEvent("error", null, buildBillingMessage(billingResult, "O Google Play nao conseguiu concluir a compra."))
        );
    }

    private void handlePurchaseUpdate(Purchase purchase) {
        String productId = getPrimaryProductId(purchase);

        if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            notifyListeners(
                EVENT_PURCHASE_UPDATED,
                buildPurchaseEvent("pending", productId, "O pagamento ficou pendente. Assim que o Google Play confirmar, o Premium sera liberado.")
            );
            return;
        }

        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
            notifyListeners(EVENT_PURCHASE_UPDATED, buildPurchaseEvent("cancelled", productId, "Compra cancelada."));
            return;
        }

        if (purchase.isAcknowledged()) {
            notifyListeners(EVENT_PURCHASE_UPDATED, buildPurchaseEvent("purchased", productId, null));
            return;
        }

        withReadyClient(null, client -> acknowledgePurchase(client, purchase, billingResult -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                notifyListeners(EVENT_PURCHASE_UPDATED, buildPurchaseEvent("purchased", productId, null));
                return;
            }

            notifyListeners(
                EVENT_PURCHASE_UPDATED,
                buildPurchaseEvent("error", productId, buildBillingMessage(billingResult, "A compra foi concluida, mas nao foi possivel confirmar a assinatura."))
            );
        }));
    }

    private void emitCurrentSubscriptionState(BillingClient client, String productId) {
        QueryPurchasesParams params = QueryPurchasesParams
            .newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build();

        client.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                notifyListeners(
                    EVENT_PURCHASE_UPDATED,
                    buildPurchaseEvent("error", productId, buildBillingMessage(billingResult, "Nao foi possivel confirmar a assinatura atual."))
                );
                return;
            }

            Purchase purchase = findPurchaseForProduct(purchases, productId);
            if (purchase == null) {
                notifyListeners(EVENT_PURCHASE_UPDATED, buildPurchaseEvent("cancelled", productId, "Nenhuma assinatura ativa foi encontrada."));
                return;
            }

            handlePurchaseUpdate(purchase);
        });
    }

    private void queryProductDetails(
        BillingClient client,
        String productId,
        PluginCall call,
        ProductDetailsCallback callback
    ) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product
            .newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.SUBS)
            .build();

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(product);

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(productList).build();

        client.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject(buildBillingMessage(billingResult, "Nao foi possivel carregar os detalhes da assinatura no Google Play."));
                return;
            }

            if (productDetailsList == null || productDetailsList.isEmpty()) {
                call.reject("A assinatura configurada nao foi encontrada no Google Play Console.");
                return;
            }

            callback.onResult(productDetailsList.get(0));
        });
    }

    private void acknowledgePurchase(
        BillingClient client,
        Purchase purchase,
        AcknowledgePurchaseResponseListener listener
    ) {
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams
            .newBuilder()
            .setPurchaseToken(purchase.getPurchaseToken())
            .build();

        client.acknowledgePurchase(params, listener);
    }

    private Purchase findPurchaseForProduct(List<Purchase> purchases, String productId) {
        if (purchases == null) {
            return null;
        }

        for (Purchase purchase : purchases) {
            List<String> products = purchase.getProducts();
            if (products != null && products.contains(productId)) {
                return purchase;
            }
        }

        return null;
    }

    private ProductDetails.SubscriptionOfferDetails getDefaultOfferDetails(ProductDetails productDetails) {
        List<ProductDetails.SubscriptionOfferDetails> offerDetails = productDetails.getSubscriptionOfferDetails();
        if (offerDetails == null || offerDetails.isEmpty()) {
            return null;
        }

        for (ProductDetails.SubscriptionOfferDetails offer : offerDetails) {
            if (offer.getPricingPhases() != null && offer.getPricingPhases().getPricingPhaseList() != null && !offer.getPricingPhases().getPricingPhaseList().isEmpty()) {
                return offer;
            }
        }

        return offerDetails.get(0);
    }

    private JSObject buildProductDetailsResult(ProductDetails productDetails) {
        JSObject result = new JSObject();
        result.put("productId", productDetails.getProductId());
        result.put("title", productDetails.getTitle());
        result.put("description", productDetails.getDescription());

        ProductDetails.SubscriptionOfferDetails offerDetails = getDefaultOfferDetails(productDetails);
        if (offerDetails != null) {
            result.put("basePlanId", offerDetails.getBasePlanId());
            result.put("offerId", offerDetails.getOfferId());
            result.put("offerToken", offerDetails.getOfferToken());

            List<ProductDetails.PricingPhase> phases = offerDetails.getPricingPhases() != null
                ? offerDetails.getPricingPhases().getPricingPhaseList()
                : null;

            if (phases != null && !phases.isEmpty()) {
                ProductDetails.PricingPhase phase = phases.get(phases.size() - 1);
                result.put("formattedPrice", phase.getFormattedPrice());
                result.put("priceAmountMicros", phase.getPriceAmountMicros());
                result.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                result.put("billingPeriod", phase.getBillingPeriod());
            }
        }

        return result;
    }

    private JSObject buildInactiveSubscriptionResult(String productId) {
        JSObject result = new JSObject();
        result.put("productId", productId);
        result.put("active", false);
        result.put("pending", false);
        result.put("autoRenewing", false);
        result.put("acknowledged", false);
        return result;
    }

    private JSObject buildSubscriptionResult(Purchase purchase, String productId) {
        JSObject result = new JSObject();
        result.put("productId", productId);
        result.put("active", purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED);
        result.put("pending", purchase.getPurchaseState() == Purchase.PurchaseState.PENDING);
        result.put("autoRenewing", purchase.isAutoRenewing());
        result.put("acknowledged", purchase.isAcknowledged());
        result.put("orderId", purchase.getOrderId());
        result.put("purchaseToken", purchase.getPurchaseToken());
        result.put("purchaseTime", purchase.getPurchaseTime());
        result.put("platform", "google-play");
        return result;
    }

    private JSObject buildPurchaseEvent(String status, String productId, String message) {
        JSObject result = new JSObject();
        result.put("status", status);
        result.put("platform", "google-play");
        if (productId != null) {
            result.put("productId", productId);
        }
        if (message != null && !message.trim().isEmpty()) {
            result.put("message", message);
        }
        return result;
    }

    private String getPrimaryProductId(Purchase purchase) {
        List<String> products = purchase.getProducts();
        if (products == null || products.isEmpty()) {
            return null;
        }

        return products.get(0);
    }

    private String requireProductId(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.trim().isEmpty()) {
            call.reject("Nenhum productId do Google Play foi informado.");
            return null;
        }

        return productId.trim();
    }

    private void withReadyClient(PluginCall call, BillingAction action) {
        if (billingClient == null) {
            if (call != null) {
                call.unavailable("Google Play Billing nao esta disponivel neste dispositivo.");
            }
            return;
        }

        synchronized (connectionLock) {
            if (billingClient.isReady()) {
                action.run(billingClient);
                return;
            }

            pendingActions.add(new PendingAction(call, action));
            if (isConnecting) {
                return;
            }

            isConnecting = true;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@androidx.annotation.NonNull BillingResult billingResult) {
                List<PendingAction> actionsToRun;

                synchronized (connectionLock) {
                    isConnecting = false;
                    actionsToRun = new ArrayList<>(pendingActions);
                    pendingActions.clear();
                }

                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    String message = buildBillingMessage(billingResult, "Nao foi possivel conectar ao Google Play Billing.");
                    for (PendingAction pendingAction : actionsToRun) {
                        if (pendingAction.call != null) {
                            pendingAction.call.reject(message);
                        }
                    }
                    return;
                }

                for (PendingAction pendingAction : actionsToRun) {
                    pendingAction.action.run(billingClient);
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                synchronized (connectionLock) {
                    isConnecting = false;
                }
            }
        });
    }

    private String buildBillingMessage(BillingResult billingResult, String fallback) {
        String debugMessage = billingResult.getDebugMessage();
        if (debugMessage == null || debugMessage.trim().isEmpty()) {
            return fallback;
        }

        return String.format(Locale.US, "%s (%s)", fallback, debugMessage);
    }
}
