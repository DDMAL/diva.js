# diva.js website
New project site for diva.js. Work in progress.

For local development, install [Jekyll](http://jekyllrb.com/), and in the root directory of this branch run
```
jekyll serve -w --baseurl /
```

Using [uncss](https://github.com/giakki/uncss) to remove unused Bootstrap rules using the following command:

```
uncss -s css/bootstrap.css http://ddmal.github.io/diva.js/ http://ddmal.github.io/diva.js/try http://ddmal.github.io/diva.js/download http://ddmal.github.io/diva.js/doc http://ddmal.github.io/diva.js/about http://ddmal.github.io/diva.js/try/single.html http://ddmal.github.io/diva.js/try/highlight.html > minified.css
```
