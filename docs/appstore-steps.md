# App Store – checklist r\u00e1pido (lado do c\u00f3digo)

1) **Vers\u00e3o/build**  
   - Atualize `MARKETING_VERSION` e `CURRENT_PROJECT_VERSION` (j\u00e1 est\u00e3o em 1.0.1 / 2 no projeto).  

2) **Push/APNs**  
   - Gerar chave `.p8` no App Store Connect (Keys > Apple Push Notification service).  
   - Baixar e adicionar `GoogleService-Info.plist` se usar Firebase no iOS (n\u00e3o commitar).  
   - Habilitar capabilities Push Notifications e Background Modes (remote-notification) no Xcode.

3) **Assinatura**  
   - Selecionar seu Team no Xcode (Signing & Capabilities) e usar perfis autom\u00e1ticos ou provisioning profile manual.

4) **Build/Archive**  
   - `npm run build`  
   - `npm run ios:sync` (cap sync)  
   - Abrir `ios/App/App.xcworkspace` no Xcode, setar esquema `App`, configura\u00e7\u00e3o Release, `Product > Archive`, depois distribuir para TestFlight/App Store.

5) **Privacidade**  
   - Preencher App Privacy no App Store Connect (analytics, push, billing).  
   - Incluir pol\u00edtica de privacidade (URL) na metadata.

6) **TestFlight**  
   - Criar grupo interno, testar login, billing, push, single-device guard em iOS 17+.

Observa\u00e7\u00e3o: `Info.plist` j\u00e1 tem `NSUserNotificationUsageDescription` e `UIBackgroundModes` para push remoto.
