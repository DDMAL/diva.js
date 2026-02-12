#!/bin/sh

# Converts an Elm build into an ESM module so that it can
# be imported and used as part of a JS library.

set -e

INPUT="$1"
OUTPUT="$2"



if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
  echo "Usage: scripts/elm-esm.sh <input> <output>" 1>&2
  exit 1
fi

perl -0777 -e '
my ($input, $output) = @ARGV;
open my $fh, "<", $input or die "Failed to read $input: $!";
my $js = do { local $/; <$fh> };
close $fh;

if ($js !~ /^\s*_Platform_export\(([\s\S]*)\);\n?}\(this\)\);/m) {
  die "Could not find Elm export payload.";
}
my $elm_exports = $1;

my $out = $js;
$out =~ s/\(function\s*\(scope\)\s*\{$/\/\/ -- $&/m;
$out =~ s/["'"]use strict["'"];$/\/\/ -- $&/m;
$out =~ s/function _Platform_export([\s\S]*?)\}\n/\/\*\n$&\n\*\//g;
$out =~ s/function _Platform_mergeExports([\s\S]*?)\}\n\s*}/\/\*\n$&\n\*\//g;
$out =~ s/^\s*_Platform_export\(([\s\S]*)\);\n?}\(this\)\);/\/\*\n$&\n\*\//m;
$out .= "\nexport const Elm = $elm_exports;\n";

open my $out_fh, ">", $output or die "Failed to write $output: $!";
print {$out_fh} $out;
close $out_fh;
' "$INPUT" "$OUTPUT"
