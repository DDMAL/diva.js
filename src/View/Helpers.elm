module View.Helpers exposing (ButtonConfig, viewButton, viewIf, viewMaybe)

import Html exposing (Html, button, div, text)
import Html.Attributes as Attr exposing (classList, type_)
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
        isDisabled =
            config.onClickMsg == Nothing

        buttonAttrs =
            let
                baseAttrs =
                    [ classList
                        [ ( "canvas-toolbar-button", True )
                        , ( "is-disabled", isDisabled )
                        , ( "is-fullscreen", config.isFullscreen )
                        ]
                    , type_ "button"
                    , Attr.title config.label
                    ]
            in
            case config.onClickMsg of
                Just msg ->
                    Events.onClick msg :: baseAttrs

                Nothing ->
                    Attr.disabled True :: baseAttrs
    in
    div
        [ classList [ ( "canvas-toolbar-item", True ) ] ]
        [ button buttonAttrs [ config.icon ]
        , div
            [ classList
                [ ( "canvas-toolbar-label", True )
                , ( "is-fullscreen", config.isFullscreen )
                ]
            ]
            [ text config.label ]
        ]
