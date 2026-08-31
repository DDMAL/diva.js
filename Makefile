SHELL := /bin/sh

ELM_SRC := src/Main.elm
TS_SRC := src/diva.ts
TS_ESM_SRC := src/diva-esm.ts
TS_VE_SRC := src/viewer-element.ts
TS_FT_SRC := src/filters.ts
TS_AUTH_SRC := src/auth.ts
TS_UTILS_SRC := src/image-utils.ts
CSS_SRC := $(wildcard src/styles/*.css)
DIVA_CSS := cache/diva.css
ELM_OUT := cache/elm.js
ELM_ESM := cache/elm-esm.js
DIVA_DEBUG := build/diva.debug.js
DIVA_JS := build/diva.js
DIVA_ESM := build/diva.esm.js
DIVA_IIFE_BUNDLE := cache/diva.iife.js
DIVA_ESM_BUNDLE := cache/diva.esm.bundle.js
DIVA_TYPES := build/diva-esm.d.ts
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
SWC := yarn -s swc

define print_bundle_size
	@bundle="$(1)"; \
	MINIFIED_SIZE=$$(wc -c < "$$bundle"); \
	GZIPPED_SIZE=$$(gzip -c "$$bundle" | wc -c); \
	MINIFIED_HR=$$(numfmt --to=iec-i --suffix=B "$$MINIFIED_SIZE"); \
	GZIPPED_HR=$$(numfmt --to=iec-i --suffix=B "$$GZIPPED_SIZE"); \
	printf "%-18s %10s (%7s)  %s\n" "Minified size:" "$$MINIFIED_SIZE bytes" "$$MINIFIED_HR" "$$bundle"; \
	printf "%-18s %10s (%7s)\n" "Gzipped size:" "$$GZIPPED_SIZE bytes" "$$GZIPPED_HR";
endef

.PHONY: all build build-dev clean clean-cache docs docs-check release report-build-sizes test

all: build

build: clean-cache
	$(MAKE) -j 3 $(MINIFIED_TARGETS) $(DIVA_TYPES)
	@$(MAKE) report-build-sizes

build-dev: ELM_FLAGS = --debug
build-dev:
	$(MAKE) -B ELM_FLAGS=--debug clean-cache $(DIVA_DEBUG)

test:
	yarn test

docs:
	yarn docs

docs-check:
	yarn docs:check

$(ELM_OUT): $(ELM_SRC)
	mkdir -p build
	elm make $(ELM_FLAGS) $(ELM_SRC) --output=$(ELM_OUT)

$(ELM_ESM): $(ELM_OUT) $(ELM_ESM_SCRIPT)
	./scripts/elm-esm.sh $(ELM_OUT) $(ELM_ESM)

$(DIVA_CSS): $(CSS_SRC) scripts/minify-css.mjs
	node ./scripts/minify-css.mjs

$(DIVA_DEBUG): $(TS_SRC) $(TS_VE_SRC) $(TS_FT_SRC) $(TS_AUTH_SRC) $(TS_UTILS_SRC) $(DIVA_CSS) $(ELM_ESM)
	mkdir -p public
	$(ESBUILD) $(TS_SRC) $(ESBUILD_COMMON_FLAGS) --format=iife --outfile=$(DIVA_DEBUG)

$(DIVA_IIFE_BUNDLE): $(TS_SRC) $(TS_VE_SRC) $(TS_FT_SRC) $(TS_AUTH_SRC) $(TS_UTILS_SRC) $(DIVA_CSS) $(ELM_ESM)
	@$(ESBUILD) $(TS_SRC) $(ESBUILD_COMMON_FLAGS) --format=iife --outfile=$(DIVA_IIFE_BUNDLE)

$(DIVA_ESM_BUNDLE): $(TS_ESM_SRC) $(TS_SRC) $(TS_VE_SRC) $(TS_FT_SRC) $(TS_AUTH_SRC) $(TS_UTILS_SRC) $(DIVA_CSS) $(ELM_ESM)
	@$(ESBUILD) $(TS_ESM_SRC) $(ESBUILD_COMMON_FLAGS) --format=esm --outfile=$(DIVA_ESM_BUNDLE)

$(DIVA_JS): $(DIVA_IIFE_BUNDLE) .swcrc
	@mkdir -p build
	@$(SWC) $(DIVA_IIFE_BUNDLE) --out-file $(DIVA_JS)

$(DIVA_ESM): $(DIVA_ESM_BUNDLE) .swcrc
	@mkdir -p build
	@$(SWC) $(DIVA_ESM_BUNDLE) --out-file $(DIVA_ESM)

$(DIVA_TYPES): $(TS_ESM_SRC) $(TS_SRC) $(TS_VE_SRC) $(TS_FT_SRC) $(TS_AUTH_SRC) $(TS_UTILS_SRC) src/public-api.ts tsconfig.json
	@mkdir -p build
	@yarn -s tsc -p tsconfig.json --declaration --emitDeclarationOnly --outDir build

report-build-sizes: $(MINIFIED_TARGETS)
	$(call print_bundle_size,$(DIVA_JS))
	$(call print_bundle_size,$(DIVA_ESM))

clean:
	rm -rf build/docs
	rm -f $(ELM_OUT) $(ELM_ESM) $(DIVA_JS) $(DIVA_ESM) $(DIVA_DEBUG) $(DIVA_CSS) build/*.d.ts build/diva.css build/diva.min.css

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
