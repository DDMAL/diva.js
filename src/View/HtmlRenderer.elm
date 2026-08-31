module View.HtmlRenderer exposing (Node(..), parse, renderHtml)

{-| A deliberately small, safe HTML parser for the subset of markup permitted
in IIIF manifest text. It uses `elm/parser`, rather than trying to implement
the complete HTML5 parsing algorithm.
-}

import Char
import Html exposing (Html, node, text)
import Html.Attributes as HA
import Parser exposing ((|.), (|=), Parser)


type Node
    = Text String
    | Element String (List ( String, String )) (List Node)


type Token
    = StartTag String (List ( String, String )) Bool
    | EndTag String
    | TextToken String


type alias OpenElement =
    { name : String
    , attributes : List ( String, String )
    , children : List Node
    }


type alias TreeState =
    { openElements : List OpenElement
    , roots : List Node
    }


renderHtml : String -> List (Html msg)
renderHtml rawHtml =
    parse rawHtml |> List.map renderNode


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


documentParser : Parser (List Token)
documentParser =
    Parser.loop [] documentStep


documentStep : List Token -> Parser (Parser.Step (List Token) (List Token))
documentStep reversedTokens =
    Parser.oneOf
        [ Parser.end |> Parser.map (\_ -> Parser.Done (List.reverse reversedTokens))
        , tokenParser |> Parser.map (\token -> Parser.Loop (token :: reversedTokens))
        ]


tokenParser : Parser Token
tokenParser =
    Parser.oneOf
        [ Parser.backtrackable commentParser
        , Parser.backtrackable tagParser
        , textParser
        , Parser.symbol "<" |> Parser.map (\_ -> TextToken "<")
        ]


commentParser : Parser Token
commentParser =
    Parser.succeed (TextToken "")
        |. Parser.symbol "<!--"
        |. Parser.chompUntil "-->"


tagParser : Parser Token
tagParser =
    Parser.oneOf
        [ endTagParser
        , startTagParser
        ]


endTagParser : Parser Token
endTagParser =
    Parser.succeed EndTag
        |. Parser.symbol "</"
        |= tagNameParser
        |. whitespace
        |. Parser.symbol ">"


startTagParser : Parser Token
startTagParser =
    Parser.succeed identity
        |. Parser.symbol "<"
        |= tagNameParser
        |> Parser.andThen startTagTail


startTagTail : String -> Parser Token
startTagTail name =
    Parser.loop [] (startTagStep name)


startTagStep : String -> List ( String, String ) -> Parser (Parser.Step (List ( String, String )) Token)
startTagStep name reversedAttributes =
    Parser.oneOf
        [ Parser.symbol "/>" |> Parser.map (\_ -> Parser.Done (StartTag name (List.reverse reversedAttributes) True))
        , Parser.symbol ">" |> Parser.map (\_ -> Parser.Done (StartTag name (List.reverse reversedAttributes) False))
        , whitespace1 |> Parser.map (\_ -> Parser.Loop reversedAttributes)
        , attributeParser |> Parser.map (\attribute -> Parser.Loop (attribute :: reversedAttributes))
        ]


tagNameParser : Parser String
tagNameParser =
    Parser.getChompedString (chompOneOrMore isTagNameCharacter)
        |> Parser.map String.toLower


attributeParser : Parser ( String, String )
attributeParser =
    Parser.getChompedString (chompOneOrMore isAttributeNameCharacter)
        |> Parser.map String.toLower
        |> Parser.andThen attributeValueParser


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


attributeStringParser : Parser String
attributeStringParser =
    Parser.oneOf
        [ quotedAttributeParser '"'
        , quotedAttributeParser '\''
        , Parser.getChompedString (chompOneOrMore isUnquotedAttributeCharacter)
        ]


quotedAttributeParser : Char -> Parser String
quotedAttributeParser quote =
    Parser.succeed identity
        |. Parser.chompIf ((==) quote)
        |= Parser.getChompedString (Parser.chompWhile ((/=) quote))
        |. Parser.chompIf ((==) quote)


textParser : Parser Token
textParser =
    Parser.getChompedString (chompOneOrMore ((/=) '<'))
        |> Parser.map (decodeEntities >> TextToken)


whitespace : Parser ()
whitespace =
    Parser.chompWhile isWhitespace


whitespace1 : Parser ()
whitespace1 =
    Parser.succeed ()
        |. Parser.chompIf isWhitespace
        |. Parser.chompWhile isWhitespace


chompOneOrMore : (Char -> Bool) -> Parser ()
chompOneOrMore predicate =
    Parser.succeed ()
        |. Parser.chompIf predicate
        |. Parser.chompWhile predicate


isTagNameCharacter : Char -> Bool
isTagNameCharacter character =
    Char.isAlpha character || Char.isDigit character || character == '-'


isAttributeNameCharacter : Char -> Bool
isAttributeNameCharacter character =
    not (isWhitespace character || character == '=' || character == '>' || character == '/')


isUnquotedAttributeCharacter : Char -> Bool
isUnquotedAttributeCharacter character =
    not (isWhitespace character || character == '>' || character == '/')


isWhitespace : Char -> Bool
isWhitespace character =
    List.member character [ ' ', '\t', '\n', '\u{000D}', '\u{000C}' ]


applyToken : Token -> TreeState -> TreeState
applyToken token state =
    case token of
        TextToken value ->
            if String.isEmpty value then
                state

            else
                appendNode (Text value) state

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


appendNode : Node -> TreeState -> TreeState
appendNode child state =
    case state.openElements of
        openElement :: remaining ->
            { state | openElements = { openElement | children = child :: openElement.children } :: remaining }

        [] ->
            { state | roots = child :: state.roots }


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
        openElement :: _ ->
            let
                closedState =
                    closeTop state
            in
            if openElement.name == name then
                closedState

            else
                closeThrough name closedState

        [] ->
            state


closeTop : TreeState -> TreeState
closeTop state =
    case state.openElements of
        openElement :: remaining ->
            appendNode
                (Element openElement.name openElement.attributes (List.reverse openElement.children))
                { state | openElements = remaining }

        [] ->
            state


emptyTree : TreeState
emptyTree =
    { openElements = [], roots = [] }


isVoidElement : String -> Bool
isVoidElement name =
    name == "br" || name == "img"


sanitizeNodes : List Node -> List Node
sanitizeNodes nodes =
    List.concatMap sanitizeNode nodes


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


isAllowedTag : String -> Bool
isAllowedTag name =
    List.member name
        [ "div", "p", "br", "em", "i", "strong", "b", "a", "ul", "ol", "li", "dl", "dt", "dd", "span", "img" ]


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


sanitizeAnchorAttribute : ( String, String ) -> Maybe ( String, String )
sanitizeAnchorAttribute ( name, value ) =
    if name == "href" && isSafeUrl value then
        Just ( name, value )

    else
        Nothing


isSafeUrl : String -> Bool
isSafeUrl value =
    let
        normalized =
            String.toLower (String.trim value)
    in
    String.startsWith "https://" normalized || String.startsWith "http://" normalized || String.startsWith "mailto:" normalized || String.startsWith "tel:" normalized || String.startsWith "/" normalized || String.startsWith "./" normalized || String.startsWith "../" normalized || String.startsWith "#" normalized || String.startsWith "?" normalized || not (String.contains ":" normalized)


renderNode : Node -> Html msg
renderNode nodeValue =
    case nodeValue of
        Text value ->
            text value

        Element name attributes children ->
            node name (List.map renderAttribute attributes) (List.map renderNode children)


renderAttribute : ( String, String ) -> Html.Attribute msg
renderAttribute ( name, value ) =
    HA.attribute name value


decodeEntities : String -> String
decodeEntities value =
    case String.split "&" value of
        first :: remaining ->
            List.foldl (\part result -> result ++ decodeEntityPart part) first remaining

        [] ->
            value


decodeEntityPart : String -> String
decodeEntityPart part =
    case String.split ";" part of
        reference :: remainder :: rest ->
            entityValue reference
                |> Maybe.map (\decoded -> decoded ++ String.join ";" (remainder :: rest))
                |> Maybe.withDefault ("&" ++ part)

        _ ->
            "&" ++ part


entityValue : String -> Maybe String
entityValue reference =
    case reference of
        "amp" ->
            Just "&"

        "lt" ->
            Just "<"

        "gt" ->
            Just ">"

        "quot" ->
            Just "\""

        "apos" ->
            Just "'"

        "nbsp" ->
            Just "\u{00A0}"

        "ndash" ->
            Just "–"

        "mdash" ->
            Just "—"

        "hellip" ->
            Just "…"

        "copy" ->
            Just "©"

        "reg" ->
            Just "®"

        _ ->
            numericEntityValue reference


numericEntityValue : String -> Maybe String
numericEntityValue reference =
    if String.startsWith "#x" reference || String.startsWith "#X" reference then
        String.dropLeft 2 reference |> hexadecimalToInt |> Maybe.andThen codePointToString

    else if String.startsWith "#" reference then
        String.dropLeft 1 reference |> String.toInt |> Maybe.andThen codePointToString

    else
        Nothing


hexadecimalToInt : String -> Maybe Int
hexadecimalToInt value =
    if String.isEmpty value then
        Nothing

    else
        String.toList value |> List.foldl hexadecimalStep (Just 0)


hexadecimalStep : Char -> Maybe Int -> Maybe Int
hexadecimalStep character maybeValue =
    case ( maybeValue, hexadecimalDigit character ) of
        ( Just value, Just digit ) ->
            Just (value * 16 + digit)

        _ ->
            Nothing


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


codePointToString : Int -> Maybe String
codePointToString codePoint =
    if codePoint >= 0 && codePoint <= 1114111 then
        Just (String.fromChar (Char.fromCode codePoint))

    else
        Nothing
