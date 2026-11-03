module Annotation exposing (WithBodies, decodePage, encode, encodeWithBodies, requestPage)

import Http
import IIIF.Annotation as IIIFAnnotation
import Json.Decode as Decode
import Json.Encode as Encode


{-| Compatibility adapter for the published elm-iiif dependency. This has the
same shape and behavior as the additive decodePageWithBodies API in ../elm-iiif;
selectors and annotation metadata still use the existing library decoder. Once
that API is released, the adapter and request helper can delegate to it directly.
-}
type alias WithBodies =
    { annotation : IIIFAnnotation.Annotation
    , bodies : List IIIFAnnotation.AnnotationBody
    }


decodePage : Decode.Decoder (List WithBodies)
decodePage =
    Decode.oneOf
        [ Decode.field "resources" (Decode.list annotationDecoder)
        , Decode.field "items" (Decode.list annotationDecoder)
        , Decode.list annotationDecoder
        ]


encode : Maybe String -> IIIFAnnotation.Annotation -> Encode.Value
encode imageService annotation =
    encodeWithBodies imageService { annotation = annotation, bodies = [ annotation.body ] }


encodeWithBodies : Maybe String -> WithBodies -> Encode.Value
encodeWithBodies imageService entry =
    let
        annotation =
            entry.annotation

        shapeValue =
            case annotation.target.selector of
                IIIFAnnotation.Rectangle x y width height ->
                    Encode.object
                        [ ( "kind", Encode.string "rect" )
                        , ( "x", Encode.float x )
                        , ( "y", Encode.float y )
                        , ( "width", Encode.float width )
                        , ( "height", Encode.float height )
                        ]

                IIIFAnnotation.Svg value ->
                    Encode.object [ ( "kind", Encode.string "svg" ), ( "value", Encode.string value ) ]
    in
    Encode.object
        [ ( "id", Encode.string annotation.id )
        , ( "shape", shapeValue )
        , ( "text", Encode.string (String.join "\n\n" (List.map bodyText entry.bodies)) )
        , ( "html", Encode.string (String.join "\n\n" (List.map .value entry.bodies)) )
        , ( "bodies", Encode.list encodeBody entry.bodies )
        , ( "imageService", Encode.string (Maybe.withDefault "" imageService) )
        ]


requestPage : (Result Http.Error (List WithBodies) -> msg) -> List String -> String -> Cmd msg
requestPage responseMsg acceptHeaders url =
    Http.request
        { method = "GET"
        , headers = List.map (Http.header "Accept") acceptHeaders
        , url = url
        , body = Http.emptyBody
        , expect = Http.expectJson responseMsg decodePage
        , timeout = Nothing
        , tracker = Nothing
        }


annotationDecoder : Decode.Decoder WithBodies
annotationDecoder =
    Decode.map2 WithBodies
        (Decode.value
            |> Decode.andThen
                (\value ->
                    case Decode.decodeValue IIIFAnnotation.decodePage (Encode.list identity [ value ]) of
                        Ok [ annotation ] ->
                            Decode.succeed annotation

                        Ok _ ->
                            Decode.fail "Expected one annotation"

                        Err error ->
                            Decode.fail (Decode.errorToString error)
                )
        )
        bodyDecoder


bodiesDecoder : Decode.Decoder (List IIIFAnnotation.AnnotationBody)
bodiesDecoder =
    Decode.oneOf
        [ Decode.list (Decode.lazy (\_ -> bodiesDecoder)) |> Decode.map List.concat
        , Decode.map3 IIIFAnnotation.AnnotationBody
            (Decode.oneOf [ Decode.field "value" Decode.string, Decode.field "chars" Decode.string ])
            (Decode.maybe (Decode.field "format" Decode.string))
            (Decode.maybe (Decode.field "language" Decode.string))
            |> Decode.map List.singleton
        , Decode.string |> Decode.map (\value -> [ { value = value, format = Nothing, language = Nothing } ])
        , Decode.succeed []
        ]


bodyDecoder : Decode.Decoder (List IIIFAnnotation.AnnotationBody)
bodyDecoder =
    Decode.oneOf
        [ Decode.field "body" bodiesDecoder
        , Decode.field "resource" bodiesDecoder
        , Decode.succeed []
        ]


bodyText : IIIFAnnotation.AnnotationBody -> String
bodyText body =
    let
        format =
            body.format
                |> Maybe.withDefault ""
                |> String.split ";"
                |> List.head
                |> Maybe.withDefault ""
                |> String.trim
                |> String.toLower
    in
    if format == "text/plain" then
        body.value

    else
        stripTags body.value


encodeBody : IIIFAnnotation.AnnotationBody -> Encode.Value
encodeBody body =
    Encode.object
        (List.filterMap identity
            [ Just ( "value", Encode.string body.value )
            , Maybe.map (\format -> ( "format", Encode.string format )) body.format
            , Maybe.map (\language -> ( "language", Encode.string language )) body.language
            ]
        )


stripTags : String -> String
stripTags value =
    stripTagsHelp False value ""


stripTagsHelp : Bool -> String -> String -> String
stripTagsHelp inTag remaining result =
    case String.uncons remaining of
        Just ( character, rest ) ->
            if character == '<' then
                stripTagsHelp True rest result

            else if character == '>' then
                stripTagsHelp False rest result

            else if inTag then
                stripTagsHelp True rest result

            else
                stripTagsHelp False rest (result ++ String.fromChar character)

        Nothing ->
            result
