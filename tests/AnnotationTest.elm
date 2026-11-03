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
        , test "preserves all bodies and metadata through the manifest adapter" <|
            \_ ->
                Decode.decodeString Annotation.decodePage multiBodyPage
                    |> Result.map (List.concatMap .bodies)
                    |> Expect.equal
                        (Ok
                            [ { value = "<p dir=\"ltr>ltr</p>", format = Just "text/html", language = Just "en" }
                            , { value = "Literal <tag>", format = Just "text/plain", language = Nothing }
                            , { value = "<p>Actual transcription</p>", format = Just "text/html", language = Just "ar" }
                            ]
                        )
        , test "encodes bodies separately instead of concatenating markup for rendering" <|
            \_ ->
                case Decode.decodeString Annotation.decodePage multiBodyPage of
                    Ok [ entry ] ->
                        Annotation.encodeWithBodies Nothing entry
                            |> Decode.decodeValue
                                (Decode.map2 Tuple.pair
                                    (Decode.field "bodies" (Decode.list (Decode.field "value" Decode.string)))
                                    (Decode.field "text" Decode.string)
                                )
                            |> Expect.equal
                                (Ok
                                    ( [ "<p dir=\"ltr>ltr</p>", "Literal <tag>", "<p>Actual transcription</p>" ]
                                    , "ltr\n\nLiteral <tag>\n\nActual transcription"
                                    )
                                )

                    _ ->
                        Expect.fail "Expected one annotation"
        , test "keeps body metadata aligned when an alternate page field cannot decode" <|
            \_ ->
                Decode.decodeString Annotation.decodePage
                    """{"resources":[{"id":"bad","on":"no-selector","resource":"wrong"}],"items":[{"id":"good","target":"canvas#xywh=1,2,3,4","body":[{"value":"correct"}]}]}"""
                    |> Result.map (List.concatMap .bodies)
                    |> Result.map (List.map .value)
                    |> Expect.equal (Ok [ "correct" ])
        ]


multiBodyPage : String
multiBodyPage =
    """{"resources":[{"@id":"multi","on":"canvas#xywh=1,2,3,4","resource":[{"chars":"<p dir=\\"ltr>ltr</p>","format":"text/html","language":"en"},null,{"id":"image","type":"Image"},[{"value":"Literal <tag>","format":"text/plain"},{"chars":"<p>Actual transcription</p>","format":"text/html","language":"ar"}]]}]}"""


svgAnnotationList : String
svgAnnotationList =
    """{"resources":[{"@id":"a2","on":{"selector":{"@type":"oa:Choice","item":{"@type":"oa:SvgSelector","value":"<svg><path d='M0 0 L20 20'/></svg>"}}}}]}"""


v2AnnotationList : String
v2AnnotationList =
    """{"resources":[{"@id":"a1","on":"https://example.test/canvas#xywh=10,20,30,40","resource":{"chars":"<p>hello</p>"}}]}"""


v3AnnotationPage : String
v3AnnotationPage =
    """{"items":[{"id":"a3","body":{"type":"TextualBody","value":"Der Gänseliesel-Brunnen"},"target":{"type":"SpecificResource","selector":{"type":"FragmentSelector","value":"xywh=300,800,1200,1200"}}}]}"""
