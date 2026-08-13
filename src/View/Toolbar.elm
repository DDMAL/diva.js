module View.Toolbar exposing (viewToolbar)

import Auth
import Html exposing (Html, button, div, text)
import Html.Attributes as HA exposing (classList)
import Html.Lazy as Lazy
import IIIF.Language exposing (extractLabelFromLanguageMap)
import Model exposing (Model, ResourceResponse(..), SidebarState(..), ViewMode(..), currentManifest, getPageAt, pageViewStartIndex)
import Msg exposing (Msg(..))
import Utilities exposing (disabledIf, isNothing)
import View.Helpers exposing (emptyHtml, viewButton, viewButtonWithAttributes)
import View.Icons as Icons


viewToolbar : Model -> Html Msg
viewToolbar model =
    let
        controlsDisabled =
            currentManifest model |> isNothing

        currentLabelText =
            currentLabelFor model
    in
    div [ HA.class "diva-canvas-toolbar-stack" ]
        [ div [ HA.class "diva-canvas-toolbar" ]
            [ div [ HA.class "diva-canvas-toolbar-section" ]
                [ viewCollectionSidebarButton model
                , viewButton
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
            , div [ HA.class "diva-canvas-toolbar-end" ]
                [ Lazy.lazy2 viewCurrentLabel model.fullscreen currentLabelText
                , div [ HA.class "diva-canvas-toolbar-section is-right" ]
                    (viewLogoutActions model
                        ++ [ viewButton
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
                                { label = "Shift Pages"
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
                           , viewButtonWithAttributes
                                [ HA.attribute "data-diva-action" "fullscreen" ]
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
                    )
                ]
            ]
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


viewCollectionSidebarButton : Model -> Html Msg
viewCollectionSidebarButton model =
    case model.resourceResponse of
        ResourceLoadedCollection _ ->
            viewButton
                { label =
                    if model.collectionSidebarVisible then
                        "Hide Collection"

                    else
                        "Show Collection"
                , icon =
                    if model.collectionSidebarVisible then
                        Icons.hideSidebar

                    else
                        Icons.showCollection
                , onClickMsg = Just UserToggledCollectionSidebar
                , isFullscreen = model.fullscreen
                }

        _ ->
            emptyHtml


viewCurrentLabel : Bool -> String -> Html Msg
viewCurrentLabel fullscreen labelText =
    div
        [ classList
            [ ( "diva-canvas-label", True )
            , ( "is-fullscreen", fullscreen )
            ]
        ]
        [ text labelText ]


viewLogoutActions : Model -> List (Html Msg)
viewLogoutActions model =
    Auth.logoutActions model.auth
        |> List.map
            (\action ->
                let
                    label =
                        action.label
                            |> Maybe.map (extractLabelFromLanguageMap model.detectedLanguage)
                            |> Maybe.withDefault "Log out"

                    displayLabel =
                        case action.error of
                            Just _ ->
                                label ++ " (popup blocked)"

                            Nothing ->
                                label
                in
                div
                    [ HA.class "diva-canvas-toolbar-item"
                    , HA.attribute "data-tooltip" displayLabel
                    ]
                    [ button
                        [ HA.class "diva-canvas-toolbar-button"
                        , HA.type_ "button"
                        , HA.attribute "aria-label" displayLabel
                        , HA.attribute "data-diva-auth-logout" action.sessionId
                        , HA.attribute "data-diva-auth-url" action.url
                        ]
                        [ Icons.shiftRight ]
                    ]
            )
