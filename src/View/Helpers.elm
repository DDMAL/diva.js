module View.Helpers exposing (ButtonConfig, viewButton, viewIf, viewMaybe)

import Html exposing (Html, button, div, text)
import Html.Attributes as HA exposing (classList, type_)
import Html.Events as Events
import Utilites exposing (choose, unpack)


type alias ButtonConfig msg =
    { label : String
    , icon : Html msg
    , onClickMsg : Maybe msg
    , isFullscreen : Bool
    }


viewIf : Html msg -> Bool -> Html msg
viewIf viewFunc condition =
    choose condition (\() -> viewFunc) (\() -> text "")


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
    unpack (\() -> text "") viewFunc maybeBody


viewButton : ButtonConfig msg -> Html msg
viewButton config =
    let
        buttonAttrs =
            let
                isDisabled =
                    config.onClickMsg == Nothing

                baseAttrs =
                    [ classList
                        [ ( "canvas-toolbar-button", True )
                        , ( "is-disabled", isDisabled )
                        , ( "is-fullscreen", config.isFullscreen )
                        ]
                    , type_ "button"
                    , HA.title config.label
                    ]
            in
            case config.onClickMsg of
                Just msg ->
                    Events.onClick msg :: baseAttrs

                Nothing ->
                    HA.disabled True :: baseAttrs
    in
    div
        [ HA.class "canvas-toolbar-item" ]
        [ button buttonAttrs [ config.icon ]
        , div
            [ classList
                [ ( "canvas-toolbar-label", True )
                , ( "is-fullscreen", config.isFullscreen )
                ]
            ]
            [ text config.label ]
        ]
