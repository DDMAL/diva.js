module Annotation exposing (encode)

import IIIF.Annotation as IIIFAnnotation
import Json.Encode as Encode


encode : Maybe String -> IIIFAnnotation.Annotation -> Encode.Value
encode imageService annotation =
    let
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
        , ( "text", Encode.string (stripTags annotation.body.value) )
        , ( "html", Encode.string annotation.body.value )
        , ( "imageService", Encode.string (Maybe.withDefault "" imageService) )
        ]


stripTags : String -> String
stripTags value =
    stripTagsHelp False value ""


stripTagsHelp : Bool -> String -> String -> String
stripTagsHelp inTag remaining result =
    case String.uncons remaining of
        Nothing ->
            result

        Just ( character, rest ) ->
            if character == '<' then
                stripTagsHelp True rest result

            else if character == '>' then
                stripTagsHelp False rest result

            else if inTag then
                stripTagsHelp True rest result

            else
                stripTagsHelp False rest (result ++ String.fromChar character)
