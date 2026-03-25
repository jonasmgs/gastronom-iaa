# Checklist r\u00e1pido para lojas (Play Store / App Store)

- **Assinatura Android**: crie um keystore, preencha `android/key.properties` (use `android/key.properties.example` como modelo) e mantenha fora do git.
- **Notifica\u00e7\u00f5es**: forne\u00e7a `google-services.json` (Android) e habilite Push/APNs no Xcode com a chave `.p8`. O app j\u00e1 declara `POST_NOTIFICATIONS` (Android 13+) e `NSUserNotificationUsageDescription`.
- **Billing**: configure produtos/assinaturas nas lojas e teste com contas de licen\u00e7a (Play) e Sandbox/TestFlight (Apple).
- **Vers\u00f5es**: incremente `versionCode`/`versionName` em `android/app/build.gradle` e `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` no Xcode a cada envio.
- **Pol\u00edtica de privacidade**: publique uma URL acess\u00edvel e referencie-a nas submiss\u00f5es; preencha Data Safety (Play) e App Privacy (Apple).
- **\u00cdcones/Splash**: valide que o \u00edcone 1024x1024 (sem transpar\u00eancia para Play) e os assets est\u00e3o corretos em `android/res/mipmap-*` e `ios/App/App/Assets.xcassets`.
- **Build de release**: `./android/gradlew assembleRelease` (Android) e `xcodebuild -configuration Release` (iOS) ou TestFlight antes de submeter.
