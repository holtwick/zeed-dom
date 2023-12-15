// Copyright (c) 2020 Dirk Holtwick. All rights reserved. https://holtwick.de/copyright

import { handleHTML } from './manipulate'

describe('manipulate', () => {
  it('should manipulate html', () => {
    const html = `<!DOCTYPE html>
    <html lang="de">
      <body>
        <p class="img-wrapper"><img src="/assets/ocr@2x-97ede361.png" alt="" width="621" height="422"></p>
      </body>
    </html>
    `

    const rhtml = handleHTML(html, (document) => {
      const img = document.querySelector('.img-wrapper img')
      // console.log('img', img)
      if (img)
        img.setAttribute('title', 'hello')
    })

    expect(rhtml).toMatchInlineSnapshot(`
      "<!DOCTYPE html>
          <html lang="de">
            <body>
              <p class="img-wrapper"><img src="/assets/ocr@2x-97ede361.png" alt="" width="621" height="422"></p>
            </body>
          </html>
          "
    `)
  })
})
