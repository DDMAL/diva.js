module AnnotationTest exposing (tests)

import Annotation exposing (encode)
import Expect
import IIIF.Annotation exposing (AnnotationSelector(..), decodePage)
import Json.Decode as Decode
import Test exposing (Test, describe, test)


tests : Test
tests =
    describe "IIIF annotation decoder"
        [ test "decodes a v2 xywh annotation body" <|
            \_ ->
                case Decode.decodeString decodePage v2AnnotationList of
                    Ok [ annotation ] ->
                        Expect.equal ( Rectangle 10 20 30 40, "<p>hello</p>" ) ( annotation.target.selector, annotation.body.value )

                    _ ->
                        Expect.fail "Expected one rectangle annotation"
        , test "prefers an SVG selector from a v2 choice" <|
            \_ ->
                case Decode.decodeString decodePage svgAnnotationList of
                    Ok [ annotation ] ->
                        case annotation.target.selector of
                            Rectangle _ _ _ _ ->
                                Expect.fail "Expected an SVG annotation"

                            Svg value ->
                                Expect.equal True (String.contains "path" value)

                    _ ->
                        Expect.fail "Expected one SVG annotation"
        , test "decodes a v3 FragmentSelector with its xywh prefix" <|
            \_ ->
                case Decode.decodeString decodePage v3AnnotationPage of
                    Ok [ annotation ] ->
                        Expect.equal (Rectangle 300 800 1200 1200) annotation.target.selector

                    _ ->
                        Expect.fail "Expected one v3 rectangle annotation"
        , test "encodes the canvas image service for a panel extract" <|
            \_ ->
                encode (Just "https://images.example/iiif/book-1/info.json")
                    { id = "a4"
                    , target = { source = Just "https://example.test/canvas", selector = Rectangle 10 20 30 40 }
                    , body = { value = "crop", format = Nothing, language = Nothing }
                    , motivation = Nothing
                    }
                    |> Decode.decodeValue (Decode.field "imageService" Decode.string)
                    |> Expect.equal (Ok "https://images.example/iiif/book-1/info.json")
        ]


svgAnnotationList : String
svgAnnotationList =
    """{"resources":[{"@id":"a2","on":{"selector":{"@type":"oa:Choice","item":{"@type":"oa:SvgSelector","value":"<svg><path d='M0 0 L20 20'/></svg>"}}}}]}"""


v2AnnotationList : String
v2AnnotationList =
    """{"resources":[{"@id":"a1","on":"https://example.test/canvas#xywh=10,20,30,40","resource":{"chars":"<p>hello</p>"}}]}"""


v3AnnotationPage : String
v3AnnotationPage =
    """{"items":[{"id":"a3","body":{"type":"TextualBody","value":"Der Gänseliesel-Brunnen"},"target":{"type":"SpecificResource","selector":{"type":"FragmentSelector","value":"xywh=300,800,1200,1200"}}}]}"""
