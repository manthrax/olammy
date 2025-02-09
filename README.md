
## Checkout the gallery online here:

https://manthrax.github.io/olammy/public/index.html

## To just mess with the shaders themselves in isolation

public/data.json ---- Contains the list of shader names

public/data/     ---- Contains the fragment shaders themselves.

If you save one of the shaders from the viewer, you will get a standalone HTML that you can plug other shaders into.

## To run the actual generator locally...

Install ollama ...

https://ollama.com/

once installed...

ollama pull deepseek-r1:32b

(or deepseek-r1:7b or deepseek-r1:14b ) // but these don't produce great results...

then from the root directory:

node index.mjs

and hit localhost:3000

 
