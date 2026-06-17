SHELL := /bin/sh

ELM_SRC := src/Main.elm
TS_SRC := src/diva.ts
TS_ESM_SRC := src/diva-esm.ts
TS_VE_SRC := src/viewer-element.ts
TS_FT_SRC := src/filters.ts
CSS_SRC := $(wildcard src/styles/*.css)
DIVA_CSS := cache/diva.css
ELM_OUT := cache/elm.js
ELM_ESM := cache/elm-esm.js
DIVA_DEBUG := build/diva.debug.js
DIVA_JS := build/diva.js
DIVA_ESM := build/diva.esm.js
MINIFIED_TARGETS := $(DIVA_JS) $(DIVA_ESM)
ELM_ESM_SCRIPT := scripts/elm-esm.sh
ELM_FLAGS ?= --optimize
VERSION ?= $(shell node -p "require('./package.json').version")
RELEASE_PREFIX := diva.js-$(VERSION)
RELEASE_DIR := release
RELEASE_TAR := $(RELEASE_DIR)/$(RELEASE_PREFIX).tar.gz
RELEASE_ZIP := $(RELEASE_DIR)/$(RELEASE_PREFIX).zip
ESBUILD := yarn -s esbuild
ESBUILD_COMMON_FLAGS := --bundle --platform=browser --target=es2019 --loader:.css=text
ESBUILD_MINIFY_FLAGS := --minify --drop:console --pure:F2 --pure:F3 --pure:F4 --pure:F5 --pure:F6 --pure:F7 --pure:F8 --pure:F9 --pure:A2 --pure:A3 --pure:A4 --pure:A5 --pure:A6 --pure:A7 --pure:A8 --pure:A9

define print_bundle_size
	@bundle="$(1)"; \
	MINIFIED_SIZE=$$(wc -c < "$$bundle"); \
	GZIPPED_SIZE=$$(gzip -c "$$bundle" | wc -c); \
	MINIFIED_HR=$$(numfmt --to=iec-i --suffix=B "$$MINIFIED_SIZE"); \
	GZIPPED_HR=$$(numfmt --to=iec-i --suffix=B "$$GZIPPED_SIZE"); \
	printf "%-18s %10s (%7s)  %s\n" "Minified size:" "$$MINIFIED_SIZE bytes" "$$MINIFIED_HR" "$$bundle"; \
	printf "%-18s %10s (%7s)\n" "Gzipped size:" "$$GZIPPED_SIZE bytes" "$$GZIPPED_HR";
endef

.PHONY: all build build-dev clean clean-cache release report-build-sizes

all: build

build: clean-cache
	$(MAKE) -j 2 $(MINIFIED_TARGETS)
	@$(MAKE) report-build-sizes

build-dev: ELM_FLAGS = --debug
build-dev:
	$(MAKE) -B ELM_FLAGS=--debug clean-cache $(DIVA_DEBUG)

$(ELM_OUT): $(ELM_SRC)
	mkdir -p build
	elm make $(ELM_FLAGS) $(ELM_SRC) --output=$(ELM_OUT)

$(ELM_ESM): $(ELM_OUT) $(ELM_ESM_SCRIPT)
	./scripts/elm-esm.sh $(ELM_OUT) $(ELM_ESM)

$(DIVA_CSS): $(CSS_SRC) scripts/minify-css.mjs
	node ./scripts/minify-css.mjs

$(DIVA_DEBUG): $(TS_SRC) $(TS_VE_SRC) $(TS_FT_SRC) $(DIVA_CSS) $(ELM_ESM)
	mkdir -p public
	$(ESBUILD) $(TS_SRC) $(ESBUILD_COMMON_FLAGS) --format=iife --outfile=$(DIVA_DEBUG)

$(DIVA_JS): $(TS_SRC) $(TS_VE_SRC) $(TS_FT_SRC) $(DIVA_CSS) $(ELM_ESM)
	@$(ESBUILD) $(TS_SRC) $(ESBUILD_COMMON_FLAGS) --format=iife $(ESBUILD_MINIFY_FLAGS) --outfile=$(DIVA_JS)

$(DIVA_ESM): $(TS_ESM_SRC) $(TS_SRC) $(TS_VE_SRC) $(TS_FT_SRC) $(DIVA_CSS) $(ELM_ESM)
	@$(ESBUILD) $(TS_ESM_SRC) $(ESBUILD_COMMON_FLAGS) --format=esm $(ESBUILD_MINIFY_FLAGS) --outfile=$(DIVA_ESM)

report-build-sizes: $(MINIFIED_TARGETS)
	$(call print_bundle_size,$(DIVA_JS))
	$(call print_bundle_size,$(DIVA_ESM))

clean:
	rm -f $(ELM_OUT) $(ELM_ESM) $(DIVA_JS) $(DIVA_ESM) $(DIVA_DEBUG) $(DIVA_CSS) build/diva.css build/diva.min.css

clean-cache:
	rm -f cache/*

release: clean build build-dev
	mkdir -p $(RELEASE_DIR)
	@LICENSE_FILE=$$(ls LICENSE* 2>/dev/null | head -n 1); \
	if [ -z "$$LICENSE_FILE" ]; then \
		echo "Error: no LICENSE file found in project root."; \
		exit 1; \
	fi; \
	tar -czf "$(RELEASE_TAR)" build README.md "$$LICENSE_FILE"; \
	zip -rq "$(RELEASE_ZIP)" build README.md "$$LICENSE_FILE"; \
	echo "Created $(RELEASE_TAR)"; \
	echo "Created $(RELEASE_ZIP)"

publish: clean build
	npm publish
