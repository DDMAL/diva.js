module View.HtmlRenderer exposing (renderHtml)

import Html exposing (Html, text)
import Html.Parser as HtmlParser
import Html.Parser.Util as HtmlParserUtil


renderHtml : String -> List (Html msg)
renderHtml rawHtml =
    let
        normalized =
            normalizeHtml rawHtml

        renderNodes nodes =
            sanitizeNodes nodes
                |> HtmlParserUtil.toVirtualDom
    in
    case HtmlParser.run normalized of
        Ok nodes ->
            renderNodes nodes

        Err _ ->
            case HtmlParser.run ("<div>" ++ normalized ++ "</div>") of
                Ok nodes ->
                    unwrapRootDiv nodes
                        |> renderNodes

                Err _ ->
                    [ text rawHtml ]


ensureAnchorDefaults : List HtmlParser.Attribute -> List HtmlParser.Attribute
ensureAnchorDefaults attrs =
    let
        hasTarget =
            List.any (\attr -> Tuple.first attr == "target") attrs

        hasRel =
            List.any (\attr -> Tuple.first attr == "rel") attrs
    in
    attrs
        |> (\current ->
                if hasTarget then
                    current

                else
                    ( "target", "_blank" ) :: current
           )
        |> (\current ->
                if hasRel then
                    current

                else
                    ( "rel", "noopener noreferrer" ) :: current
           )


isAllowedTag : String -> Bool
isAllowedTag tag =
    List.member tag [ "p", "br", "em", "i", "strong", "b", "a", "ul", "ol", "li", "span", "img" ]


normalizeHtml : String -> String
normalizeHtml rawHtml =
    String.replace "<br>" "<br/>" rawHtml
        |> String.replace "<br />" "<br/>"
        |> String.replace "</p></p>" "</p>"


sanitizeAnchorAttr : HtmlParser.Attribute -> Maybe HtmlParser.Attribute
sanitizeAnchorAttr attr =
    case Tuple.first attr of
        "href" ->
            Just attr

        _ ->
            Nothing


sanitizeAttrs : String -> List HtmlParser.Attribute -> List HtmlParser.Attribute
sanitizeAttrs tag attrs =
    case tag of
        "a" ->
            List.filterMap sanitizeAnchorAttr attrs
                |> ensureAnchorDefaults

        "img" ->
            List.filterMap sanitizeImageAttr attrs

        _ ->
            []


sanitizeImageAttr : HtmlParser.Attribute -> Maybe HtmlParser.Attribute
sanitizeImageAttr attr =
    case Tuple.first attr of
        "alt" ->
            Just attr

        "src" ->
            Just attr

        _ ->
            Nothing


sanitizeNode : HtmlParser.Node -> List HtmlParser.Node
sanitizeNode node =
    case node of
        HtmlParser.Text textValue ->
            [ HtmlParser.Text textValue ]

        HtmlParser.Element tag attrs children ->
            if isAllowedTag tag then
                [ HtmlParser.Element tag (sanitizeAttrs tag attrs) (sanitizeNodes children) ]

            else
                sanitizeNodes children

        HtmlParser.Comment _ ->
            []


sanitizeNodes : List HtmlParser.Node -> List HtmlParser.Node
sanitizeNodes nodes =
    List.concatMap sanitizeNode nodes


unwrapRootDiv : List HtmlParser.Node -> List HtmlParser.Node
unwrapRootDiv nodes =
    case nodes of
        [ HtmlParser.Element "div" _ children ] ->
            children

        _ ->
            nodes
