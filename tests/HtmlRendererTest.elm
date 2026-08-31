module HtmlRendererTest exposing (tests)

import Expect
import Test exposing (Test, describe, test)
import View.HtmlRenderer exposing (Node(..), parse)


tests : Test
tests =
    describe "View.HtmlRenderer"
        [ test "parses the supported nested elements and core entities" <|
            \_ ->
                Expect.equal
                    [ Element "p"
                        []
                        [ Text "Hello "
                        , Element "strong" [] [ Text "world" ]
                        , Text "\u{00A0}©"
                        ]
                    ]
                    (parse "<p>Hello <strong>world</strong>&nbsp;&copy;</p>")
        , test "keeps only safe anchor attributes and adds safe link defaults" <|
            \_ ->
                Expect.equal
                    [ Element "a"
                        [ ( "href", "https://example.test/entry" )
                        , ( "target", "_blank" )
                        , ( "rel", "noopener noreferrer" )
                        ]
                        [ Text "Entry" ]
                    ]
                    (parse "<a href='https://example.test/entry' onclick='alert(1)'>Entry</a>")
        , test "removes unsafe anchor URLs while preserving link content" <|
            \_ ->
                Expect.equal
                    [ Element "a"
                        [ ( "target", "_blank" ), ( "rel", "noopener noreferrer" ) ]
                        [ Text "Unsafe" ]
                    ]
                    (parse "<a href='javascript:alert(1)'>Unsafe</a>")
        , test "keeps manifest image sources and alt text only" <|
            \_ ->
                Expect.equal
                    [ Element "img" [ ( "src", "data:image/png;base64,abc" ), ( "alt", "Image" ) ] [] ]
                    (parse "<img src='data:image/png;base64,abc' alt='Image' onerror='alert(1)'>")
        , test "unwraps unsupported elements while retaining their content" <|
            \_ ->
                Expect.equal
                    [ Text "alert(1)"
                    , Element "em" [] [ Text "Retained" ]
                    ]
                    (parse "<script>alert(1)</script><em>Retained</em>")
        , test "recovers from mismatched and unclosed elements" <|
            \_ ->
                Expect.equal
                    [ Element "p" [] [ Element "strong" [] [ Text "Text" ] ] ]
                    (parse "<p><strong>Text</p>")
        , test "treats malformed tag syntax as text" <|
            \_ ->
                Expect.equal
                    [ Text "<", Text "p title=\"unterminated" ]
                    (parse "<p title=\"unterminated")
        , test "decodes numeric entities and leaves unknown names unchanged" <|
            \_ ->
                Expect.equal
                    [ Text "A A &unknown;" ]
                    (parse "&#65; &#x41; &unknown;")
        , test "drops comments" <|
            \_ ->
                Expect.equal
                    [ Element "p" [] [ Text "Visible" ] ]
                    (parse "<!-- hidden --><p>Visible</p>")
        ]
