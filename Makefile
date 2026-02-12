SHELL := /bin/sh

ELM_SRC := src/Main.elm
TS_SRC := src/diva.ts
TS_VE_SRC := src/viewer-element.ts
TS_FT_SRC := src/filters.ts
CSS_SRC := $(wildcard src/styles/*.css)
DIVA_CSS := cache/diva.css
ELM_OUT := cache/elm.js
ELM_ESM := cache/elm-esm.js
DIVA_JS := build/diva.js
DIVA_MIN := build/diva.min.js
ELM_ESM_SCRIPT := scripts/elm-esm.sh
ELM_FLAGS ?= --optimize

.PHONY: all build build-dev clean clean-cache

all: build

build: clean-cache $(DIVA_MIN)

build-dev: ELM_FLAGS = --debug
build-dev:
	$(MAKE) -B ELM_FLAGS=--debug clean-cache $(DIVA_JS)

$(ELM_OUT): $(ELM_SRC)
	mkdir -p build
	elm make $(ELM_FLAGS) $(ELM_SRC) --output=$(ELM_OUT)

$(ELM_ESM): $(ELM_OUT) $(ELM_ESM_SCRIPT)
	./scripts/elm-esm.sh $(ELM_OUT) $(ELM_ESM)

$(DIVA_CSS): $(CSS_SRC) scripts/minify-css.mjs
	node ./scripts/minify-css.mjs

$(DIVA_JS): $(TS_SRC) $(TS_VE_SRC) $(TS_FT_SRC) $(DIVA_CSS) $(ELM_ESM)
	mkdir -p public
	yarn -s esbuild $(TS_SRC) --bundle --format=iife --platform=browser --target=es2019 --loader:.css=text --outfile=$(DIVA_JS)

$(DIVA_MIN): $(TS_SRC) $(TS_VE_SRC) $(TS_FT_SRC) $(DIVA_CSS) $(ELM_ESM)
	yarn -s esbuild $(TS_SRC) --bundle --format=iife --platform=browser --target=es2019 --loader:.css=text --minify --drop:console --pure:F2 --pure:F3 --pure:F4 --pure:F5 --pure:F6 --pure:F7 --pure:F8 --pure:F9 --pure:A2 --pure:A3 --pure:A4 --pure:A5 --pure:A6 --pure:A7 --pure:A8 --pure:A9 --outfile=$(DIVA_MIN)
	@min="$(DIVA_MIN)"; \
	MINIFIED_SIZE=$$(wc -c < "$$min"); \
	GZIPPED_SIZE=$$(gzip -c "$$min" | wc -c); \
	MINIFIED_HR=$$(numfmt --to=iec-i --suffix=B "$$MINIFIED_SIZE"); \
	GZIPPED_HR=$$(numfmt --to=iec-i --suffix=B "$$GZIPPED_SIZE"); \
	printf "%-18s %10s (%7s)  %s\n" "Minified size:" "$$MINIFIED_SIZE bytes" "$$MINIFIED_HR" "$$min"; \
	printf "%-18s %10s (%7s)\n" "Gzipped size:" "$$GZIPPED_SIZE bytes" "$$GZIPPED_HR";

clean:
	rm -f $(ELM_OUT) $(ELM_ESM) $(DIVA_JS) $(DIVA_MIN) $(DIVA_CSS) build/diva.css build/diva.min.css

clean-cache:
	rm -f cache/*
