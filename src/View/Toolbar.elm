module View.Toolbar exposing (viewToolbar)

import Html exposing (Html, div, text)
import Html.Attributes as HA exposing (classList)
import Html.Lazy as Lazy
import Model exposing (Model, SidebarState(..), ViewMode(..), currentManifest, getPageAt, pageViewStartIndex)
import Msg exposing (Msg(..))
import Utilities exposing (disabledIf, isNothing)
import View.Helpers exposing (viewButton)
import View.Icons as Icons


viewToolbar : Model -> Html Msg
viewToolbar model =
    let
        controlsDisabled =
            currentManifest model |> isNothing

        currentLabelText =
            currentLabelFor model
    in
    div [ HA.class "canvas-toolbar-stack" ]
        [ div [ HA.class "canvas-toolbar" ]
            [ div [ HA.class "canvas-toolbar-section" ]
                [ viewButton
                    { label = "Zoom Out"
                    , icon = Icons.zoomOut
                    , onClickMsg = disabledIf controlsDisabled UserClickedZoomOut
                    , isFullscreen = model.fullscreen
                    }
                , viewButton
                    { label = "Zoom In"
                    , icon = Icons.zoomIn
                    , onClickMsg = disabledIf controlsDisabled UserClickedZoomIn
                    , isFullscreen = model.fullscreen
                    }
                ]
            , div [ HA.class "canvas-toolbar-section is-right" ]
                [ viewButton
                    { label = "Page View"
                    , icon = Icons.pageViewOpen
                    , onClickMsg = disabledIf controlsDisabled UserClickedOpenPageView
                    , isFullscreen = model.fullscreen
                    }
                , viewButton
                    { label = "Manifest Info"
                    , icon = Icons.info
                    , onClickMsg = disabledIf controlsDisabled UserClickedOpenManifestInfo
                    , isFullscreen = model.fullscreen
                    }
                , viewButton
                    { label =
                        if model.viewMode == OneUp then
                            "Two Page"

                        else
                            "One Page"
                    , icon =
                        if model.viewMode == OneUp then
                            Icons.openingPageView

                        else
                            Icons.scrollingPageView
                    , onClickMsg = disabledIf controlsDisabled UserToggledTwoUp
                    , isFullscreen = model.fullscreen
                    }
                , viewButton
                    { label = "Shift Page"
                    , icon =
                        if model.shiftByOne then
                            Icons.shiftLeft

                        else
                            Icons.shiftRight
                    , onClickMsg = disabledIf (controlsDisabled || model.viewMode == OneUp) UserToggledShiftByOne
                    , isFullscreen = model.fullscreen
                    }
                , viewButton
                    (let
                        sidebarVisible =
                            if model.isMobile then
                                model.mobileSidebarOpen

                            else
                                model.sidebarState /= SidebarHidden
                     in
                     { label =
                        if sidebarVisible then
                            "Hide Sidebar"

                        else
                            "Show Sidebar"
                     , icon =
                        if sidebarVisible then
                            Icons.hideSidebar

                        else
                            Icons.showSidebar
                     , onClickMsg = disabledIf controlsDisabled UserToggledSidebar
                     , isFullscreen = model.fullscreen
                     }
                    )
                , viewButton
                    { label =
                        if model.fullscreen then
                            "Exit Full"

                        else
                            "Fullscreen"
                    , icon =
                        if model.fullscreen then
                            Icons.fromFullscreen

                        else
                            Icons.toFullscreen
                    , onClickMsg = Just UserToggledFullscreen
                    , isFullscreen = model.fullscreen
                    }
                ]
            ]
        , Lazy.lazy2 viewCurrentLabel model.fullscreen currentLabelText
        ]


currentLabelFor : Model -> String
currentLabelFor model =
    let
        fullLabelText =
            case model.selectedIndex of
                Just index ->
                    case model.viewMode of
                        OneUp ->
                            getPageAt index model.pages
                                |> Maybe.map .label
                                |> Maybe.withDefault ""

                        TwoUp ->
                            let
                                startIndex =
                                    pageViewStartIndex model.viewMode model.shiftByOne index

                                firstLabel =
                                    getPageAt startIndex model.pages
                                        |> Maybe.map .label

                                secondLabel =
                                    getPageAt (startIndex + 1) model.pages
                                        |> Maybe.map .label
                            in
                            case ( firstLabel, secondLabel ) of
                                ( Just left, _ ) ->
                                    if model.shiftByOne && startIndex == 0 then
                                        left

                                    else
                                        case secondLabel of
                                            Just right ->
                                                left ++ " / " ++ right

                                            Nothing ->
                                                left

                                _ ->
                                    ""

                Nothing ->
                    ""
    in
    truncateLabel 140 fullLabelText


truncateLabel : Int -> String -> String
truncateLabel maxLength label =
    if String.length label > maxLength then
        String.left (maxLength - 3) label ++ "..."

    else
        label


viewCurrentLabel : Bool -> String -> Html Msg
viewCurrentLabel fullscreen labelText =
    div
        [ classList
            [ ( "canvas-label", True )
            , ( "is-fullscreen", fullscreen )
            ]
        ]
        [ text labelText ]
