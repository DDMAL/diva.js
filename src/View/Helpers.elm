module View.Helpers exposing (ButtonConfig, emptyHtml, viewButton, viewButtonWithAttributes, viewIf, viewMaybe)

import Html exposing (Attribute, Html, button, div, text)
import Html.Attributes as HA exposing (classList, type_)
import Html.Events as Events


type alias ButtonConfig msg =
    { label : String
    , icon : Html msg
    , onClickMsg : Maybe msg
    , isFullscreen : Bool
    }


emptyHtml : Html msg
emptyHtml =
    text ""


viewButton : ButtonConfig msg -> Html msg
viewButton config =
    viewButtonWithAttributes [] config


viewButtonWithAttributes : List (Attribute msg) -> ButtonConfig msg -> Html msg
viewButtonWithAttributes extraAttrs config =
    let
        buttonAttrs =
            let
                isDisabled =
                    config.onClickMsg == Nothing

                baseAttrs =
                    [ classList
                        [ ( "diva-canvas-toolbar-button", True )
                        , ( "is-disabled", isDisabled )
                        , ( "is-fullscreen", config.isFullscreen )
                        ]
                    , type_ "button"
                    , HA.attribute "aria-label" config.label
                    ]
            in
            case config.onClickMsg of
                Just msg ->
                    Events.onClick msg :: (extraAttrs ++ baseAttrs)

                Nothing ->
                    HA.disabled True :: (extraAttrs ++ baseAttrs)
    in
    div
        [ HA.class "diva-canvas-toolbar-item"
        , HA.attribute "data-tooltip" config.label
        ]
        [ button buttonAttrs [ config.icon ]
        ]


viewIf : Html msg -> Bool -> Html msg
viewIf view condition =
    if condition then
        view

    else
        emptyHtml


{-|

    A view helper that will either render the value of
    'body' with a given `viewFunc`, or return `Element.none`
    indicating nothing should be rendered.

    `viewFunc` can be partially applied with a `language` value
    allowing the body to be rendered in response to the user's
    selected language parameter.

-}
viewMaybe : (a -> Html msg) -> Maybe a -> Html msg
viewMaybe viewFunc maybeBody =
    case maybeBody of
        Just a ->
            viewFunc a

        Nothing ->
            emptyHtml
