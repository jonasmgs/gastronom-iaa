# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - button "Change language" [ref=e6] [cursor=pointer]:
      - img [ref=e7]
      - generic [ref=e10]: 🇺🇸
    - generic [ref=e13]:
      - generic [ref=e14]:
        - img [ref=e16]
        - heading "NutriChef AI" [level=1] [ref=e18]
        - paragraph [ref=e19]: Smart recipes with AI
      - generic [ref=e20]:
        - heading "Sign In" [level=2] [ref=e21]
        - generic [ref=e22]:
          - button "Sign in with Google" [ref=e23] [cursor=pointer]:
            - img [ref=e24]
            - generic [ref=e29]: Sign in with Google
          - button "Sign in with Apple" [ref=e30] [cursor=pointer]:
            - img [ref=e31]
            - generic [ref=e34]: Sign in with Apple
        - paragraph [ref=e35]: Ao entrar com Google ou Apple, sua conta no GastronomIA será criada ou acessada automaticamente.
        - link "Politica de privacidade e Termos" [ref=e37] [cursor=pointer]:
          - /url: /privacy
```