module View.HtmlRenderer exposing (Node(..), parse, renderHtml)

{-| A deliberately small, safe HTML parser for the subset of markup permitted
in IIIF manifest text. It uses `elm/parser`, rather than trying to implement
the complete HTML5 parsing algorithm.
-}

import Html exposing (Html, node, text)
import Html.Attributes as HA
import Parser exposing ((|.), (|=), Parser)


type Node
    = Text String
    | Element String (List ( String, String )) (List Node)


parse : String -> List Node
parse rawHtml =
    case Parser.run documentParser rawHtml of
        Ok tokens ->
            tokens
                |> List.foldl applyToken emptyTree
                |> closeAll
                |> .roots
                |> List.reverse
                |> sanitizeNodes

        Err _ ->
            [ Text rawHtml ]


renderHtml : String -> List (Html msg)
renderHtml rawHtml =
    parse rawHtml |> List.map renderNode


appendNode : Node -> TreeState -> TreeState
appendNode child state =
    case state.openElements of
        [] ->
            { state | roots = child :: state.roots }

        openElement :: remaining ->
            { state | openElements = { openElement | children = child :: openElement.children } :: remaining }


applyToken : Token -> TreeState -> TreeState
applyToken token state =
    case token of
        StartTag name attributes selfClosing ->
            if selfClosing || isVoidElement name then
                appendNode (Element name attributes []) state

            else
                { state | openElements = { name = name, attributes = attributes, children = [] } :: state.openElements }

        EndTag name ->
            if List.any (\openElement -> openElement.name == name) state.openElements then
                closeThrough name state

            else
                state

        TextToken value ->
            if String.isEmpty value then
                state

            else
                appendNode (Text value) state


attributeParser : Parser ( String, String )
attributeParser =
    Parser.getChompedString (chompOneOrMore isAttributeNameCharacter)
        |> Parser.map String.toLower
        |> Parser.andThen attributeValueParser


attributeStringParser : Parser String
attributeStringParser =
    Parser.oneOf
        [ quotedAttributeParser '"'
        , quotedAttributeParser '\''
        , Parser.getChompedString (chompOneOrMore isUnquotedAttributeCharacter)
        ]


attributeValueParser : String -> Parser ( String, String )
attributeValueParser name =
    Parser.succeed (\value -> ( name, decodeEntities value ))
        |. whitespace
        |= Parser.oneOf
            [ Parser.succeed identity
                |. Parser.symbol "="
                |. whitespace
                |= attributeStringParser
            , Parser.succeed ""
            ]


chompOneOrMore : (Char -> Bool) -> Parser ()
chompOneOrMore predicate =
    Parser.succeed ()
        |. Parser.chompIf predicate
        |. Parser.chompWhile predicate


closeAll : TreeState -> TreeState
closeAll state =
    case state.openElements of
        [] ->
            state

        _ ->
            closeAll (closeTop state)


closeThrough : String -> TreeState -> TreeState
closeThrough name state =
    case state.openElements of
        [] ->
            state

        openElement :: _ ->
            let
                closedState =
                    closeTop state
            in
            if openElement.name == name then
                closedState

            else
                closeThrough name closedState


closeTop : TreeState -> TreeState
closeTop state =
    case state.openElements of
        [] ->
            state

        openElement :: remaining ->
            appendNode
                (Element openElement.name openElement.attributes (List.reverse openElement.children))
                { state | openElements = remaining }


codePointToString : Int -> Maybe String
codePointToString codePoint =
    if codePoint >= 0 && codePoint <= 1114111 then
        Just (String.fromChar (Char.fromCode codePoint))

    else
        Nothing


commentParser : Parser Token
commentParser =
    Parser.succeed (TextToken "")
        |. Parser.symbol "<!--"
        |. Parser.chompUntil "-->"


decodeEntities : String -> String
decodeEntities value =
    case String.split "&" value of
        [] ->
            value

        first :: remaining ->
            List.foldl (\part result -> result ++ decodeEntityPart part) first remaining


decodeEntityPart : String -> String
decodeEntityPart part =
    case String.split ";" part of
        reference :: remainder :: rest ->
            entityValue reference
                |> Maybe.map (\decoded -> decoded ++ String.join ";" (remainder :: rest))
                |> Maybe.withDefault ("&" ++ part)

        _ ->
            "&" ++ part


documentParser : Parser (List Token)
documentParser =
    Parser.loop [] documentStep


documentStep : List Token -> Parser (Parser.Step (List Token) (List Token))
documentStep reversedTokens =
    Parser.oneOf
        [ Parser.end |> Parser.map (\_ -> Parser.Done (List.reverse reversedTokens))
        , tokenParser |> Parser.map (\token -> Parser.Loop (token :: reversedTokens))
        ]


emptyTree : TreeState
emptyTree =
    { openElements = [], roots = [] }


endTagParser : Parser Token
endTagParser =
    Parser.succeed EndTag
        |. Parser.symbol "</"
        |= tagNameParser
        |. whitespace
        |. Parser.symbol ">"


entityValue : String -> Maybe String
entityValue reference =
    case reference of
        "amp" ->
            Just "&"

        "apos" ->
            Just "'"

        "copy" ->
            Just "©"

        "gt" ->
            Just ">"

        "hellip" ->
            Just "…"

        "lt" ->
            Just "<"

        "mdash" ->
            Just "—"

        "nbsp" ->
            Just "\u{00A0}"

        "ndash" ->
            Just "–"

        "quot" ->
            Just "\""

        "reg" ->
            Just "®"

        _ ->
            numericEntityValue reference


hexadecimalDigit : Char -> Maybe Int
hexadecimalDigit character =
    if character >= '0' && character <= '9' then
        Just (Char.toCode character - Char.toCode '0')

    else if character >= 'a' && character <= 'f' then
        Just (10 + Char.toCode character - Char.toCode 'a')

    else if character >= 'A' && character <= 'F' then
        Just (10 + Char.toCode character - Char.toCode 'A')

    else
        Nothing


hexadecimalStep : Char -> Maybe Int -> Maybe Int
hexadecimalStep character maybeValue =
    case ( maybeValue, hexadecimalDigit character ) of
        ( Just value, Just digit ) ->
            Just (value * 16 + digit)

        _ ->
            Nothing


hexadecimalToInt : String -> Maybe Int
hexadecimalToInt value =
    if String.isEmpty value then
        Nothing

    else
        String.toList value |> List.foldl hexadecimalStep (Just 0)


isAllowedTag : String -> Bool
isAllowedTag name =
    List.member name
        [ "div", "p", "br", "em", "i", "strong", "b", "a", "ul", "ol", "li", "dl", "dt", "dd", "span", "img" ]


isAttributeNameCharacter : Char -> Bool
isAttributeNameCharacter character =
    not (isWhitespace character || character == '=' || character == '>' || character == '/')


isSafeUrl : String -> Bool
isSafeUrl value =
    let
        normalized =
            String.toLower (String.trim value)
    in
    String.startsWith "https://" normalized || String.startsWith "http://" normalized || String.startsWith "mailto:" normalized || String.startsWith "tel:" normalized || String.startsWith "/" normalized || String.startsWith "./" normalized || String.startsWith "../" normalized || String.startsWith "#" normalized || String.startsWith "?" normalized || not (String.contains ":" normalized)


isTagNameCharacter : Char -> Bool
isTagNameCharacter character =
    Char.isAlpha character || Char.isDigit character || character == '-'


isUnquotedAttributeCharacter : Char -> Bool
isUnquotedAttributeCharacter character =
    not (isWhitespace character || character == '>' || character == '/')


isVoidElement : String -> Bool
isVoidElement name =
    name == "br" || name == "img"


isWhitespace : Char -> Bool
isWhitespace character =
    List.member character [ ' ', '\t', '\n', '\u{000D}', '\u{000C}' ]


numericEntityValue : String -> Maybe String
numericEntityValue reference =
    if String.startsWith "#x" reference || String.startsWith "#X" reference then
        String.dropLeft 2 reference |> hexadecimalToInt |> Maybe.andThen codePointToString

    else if String.startsWith "#" reference then
        String.dropLeft 1 reference |> String.toInt |> Maybe.andThen codePointToString

    else
        Nothing


type alias OpenElement =
    { name : String
    , attributes : List ( String, String )
    , children : List Node
    }


quotedAttributeParser : Char -> Parser String
quotedAttributeParser quote =
    Parser.succeed identity
        |. Parser.chompIf ((==) quote)
        |= Parser.getChompedString (Parser.chompWhile ((/=) quote))
        |. Parser.chompIf ((==) quote)


renderAttribute : ( String, String ) -> Html.Attribute msg
renderAttribute ( name, value ) =
    HA.attribute name value


renderChildren : List Node -> List (Html msg)
renderChildren children =
    List.map renderNode children


renderNode : Node -> Html msg
renderNode nodeValue =
    case nodeValue of
        Text value ->
            text value

        Element name attributes children ->
            node name (List.map renderAttribute attributes) (renderChildren children)


sanitizeAnchorAttribute : ( String, String ) -> Maybe ( String, String )
sanitizeAnchorAttribute ( name, value ) =
    if name == "href" && isSafeUrl value then
        Just ( name, value )

    else
        Nothing


sanitizeAttributes : String -> List ( String, String ) -> List ( String, String )
sanitizeAttributes tag attributes =
    case tag of
        "a" ->
            List.filterMap sanitizeAnchorAttribute attributes
                ++ [ ( "target", "_blank" ), ( "rel", "noopener noreferrer" ) ]

        "img" ->
            List.filter (\( name, _ ) -> name == "src" || name == "alt") attributes

        _ ->
            []


sanitizeNode : Node -> List Node
sanitizeNode nodeValue =
    case nodeValue of
        Text value ->
            [ Text value ]

        Element name attributes children ->
            let
                sanitizedChildren =
                    sanitizeNodes children
            in
            if isAllowedTag name then
                [ Element name (sanitizeAttributes name attributes) sanitizedChildren ]

            else
                sanitizedChildren


sanitizeNodes : List Node -> List Node
sanitizeNodes nodes =
    List.concatMap sanitizeNode nodes


startTagParser : Parser Token
startTagParser =
    Parser.succeed identity
        |. Parser.symbol "<"
        |= tagNameParser
        |> Parser.andThen startTagTail


startTagStep : String -> List ( String, String ) -> Parser (Parser.Step (List ( String, String )) Token)
startTagStep name reversedAttributes =
    Parser.oneOf
        [ Parser.symbol "/>" |> Parser.map (\_ -> Parser.Done (StartTag name (List.reverse reversedAttributes) True))
        , Parser.symbol ">" |> Parser.map (\_ -> Parser.Done (StartTag name (List.reverse reversedAttributes) False))
        , whitespace1 |> Parser.map (\_ -> Parser.Loop reversedAttributes)
        , attributeParser |> Parser.map (\attribute -> Parser.Loop (attribute :: reversedAttributes))
        ]


startTagTail : String -> Parser Token
startTagTail name =
    Parser.loop [] (startTagStep name)


tagNameParser : Parser String
tagNameParser =
    Parser.getChompedString (chompOneOrMore isTagNameCharacter)
        |> Parser.map String.toLower


tagParser : Parser Token
tagParser =
    Parser.oneOf
        [ endTagParser
        , startTagParser
        ]


textParser : Parser Token
textParser =
    Parser.getChompedString (chompOneOrMore ((/=) '<'))
        |> Parser.map (decodeEntities >> TextToken)


type Token
    = StartTag String (List ( String, String )) Bool
    | EndTag String
    | TextToken String


tokenParser : Parser Token
tokenParser =
    Parser.oneOf
        [ Parser.backtrackable commentParser
        , Parser.symbol "-->" |> Parser.map (\_ -> TextToken "")
        , Parser.backtrackable tagParser
        , textParser
        , Parser.symbol "<" |> Parser.map (\_ -> TextToken "<")
        ]


type alias TreeState =
    { openElements : List OpenElement
    , roots : List Node
    }


whitespace : Parser ()
whitespace =
    Parser.chompWhile isWhitespace


whitespace1 : Parser ()
whitespace1 =
    Parser.succeed ()
        |. Parser.chompIf isWhitespace
        |. Parser.chompWhile isWhitespace
