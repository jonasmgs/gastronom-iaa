# Play Store – checklist r\u00e1pido (lado do c\u00f3digo)

1) **Assinatura**  
   - Gerar keystore.  
   - Copiar `android/key.properties.example` para `android/key.properties` e preencher senhas (n\u00e3o commitar).  
   - Garantir que `key.properties` e o `.jks` ficam fora do Git.

2) **Google services / Push (se usar FCM)**  
   - Baixar `google-services.json` do Firebase e colocar em `android/app/` (j\u00e1 ignorado no `.gitignore`).  
   - Confirmar `applicationId` = `com.gastronom.ia`.

3) **Vers\u00e3o**  
   - Editar `versionCode` e `versionName` em `android/app/build.gradle` antes de cada envio.

4) **Build de release**  
   - `npm run build`  
   - `npx cap sync android`  
   - `cd android && ./gradlew bundleRelease` (gera `.aab` para upload)  
   - (opcional) `./gradlew assembleRelease` para instalar `.apk` em device.

5) **Valida\u00e7\u00e3o no dispositivo**  
   - Instalar o `.apk` em aparelho real (Android 13/14), testar login, billing, push, offline.

6) **Console Play**  
   - Criar app, preencher Data Safety, conte\u00fado + pol\u00edtica de privacidade (URL).  
   - Criar produtos/assinaturas e testar com conta de licen\u00e7a interna.  
   - Enviar `.aab`, revis\u00e3o interna, depois produ\u00e7\u00e3o.
