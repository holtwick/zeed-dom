// Copyright (c) 2020 Dirk Holtwick. All rights reserved. https://holtwick.de/copyright

import { parseHTML } from './vdomparser'

describe('vDOM Parser', () => {
  // it('should work with js', () => {
  //   const html = 'Xyz <script type="text/javascript">var foo = \'<<bar>>\';</script>'
  //   let frag = parseHTML(html)
  //   let rhtml = frag.render()
  //   expect(rhtml).toBe('Xyz <script type="text/javascript">var foo = \'<<bar>>\';</script>')
  //   expect(rhtml).toBe(html)
  // })

  it('should respect nested', () => {
    const html = `<!DOCTYPE html>
      <html lang="de">
     <body>
     <div><h1>Test</h1><p>&quot;Lorem <br> <a href="#" style="font-wAIGHT: &amp;bold;;">ipsum</a></p></div>
    <div class="embed-video-container embed-responsive embed-responsive-16by9">
        <iframe src="https://www.youtube.com/embed/TJTsAQguaVE" frameborder="0" allowfullscreen class="embed-responsive-item"></iframe>
    </div>
    <p class="img-wrapper"><img src="/assets/ocr@2x-97ede361.png" alt="" width="621" height="422"></p>
    </body>
    </html>
    `
    const frag = parseHTML(html)
    const rhtml = frag.render()
    // expect(rhtml).toBe('Xyz <script type="text/javascript">var foo = \'<<bar>>\';</script>')
    expect(rhtml).toEqual(html)
  })
})
