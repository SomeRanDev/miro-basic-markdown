# Magic Markdown

A Miro utility app that automatically converts Markdown content in text items to a Miro-friendly representation.

Once installed on a board, execute the "Enable Markdown" action on a Text, Shape, or Sticky Note item. Whenever the enabled item is selected, its content will plain text with Markdown markup syntax. Once the item is unselected, the text will be converted into a visual representation of the Markdown formatting using Miro-safe HTML and emojis.

# Testing and Building

### How to start locally

- Run `npm i` to install dependencies.
- Run `npm start` to start developing. \
  Your URL should be similar to this example:
 ```
 http://localhost:3000
 ```
- Paste the URL under **App URL** in your
  [app settings](https://developers.miro.com/docs/build-your-first-hello-world-app#step-3-configure-your-app-in-miro).
- Open a board; you should see your app in the app toolbar or in the **Apps**
  panel.

### How to build the app

- Run `npm run build`. \
  This generates a static output inside [`dist/`](./dist), which you can host on a static hosting
  service.
