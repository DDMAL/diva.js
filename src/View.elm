module View exposing (view)

import Html exposing (Html, div, h1, node, text)
import Html.Attributes as HA exposing (classList, id)
import IIIF.Language exposing (Language(..), extractLabelFromLanguageMap)
import IIIF.Presentation exposing (toLabel, toRequiredStatement)
import Model exposing (Model, ResourceResponse(..), Response(..), SidebarState(..), ViewMode(..), currentManifest)
import Msg exposing (Msg(..))
import View.CollectionExplorer
import View.Helpers exposing (viewIf, viewMaybe)
import View.HtmlRenderer as HtmlRenderer
import View.ManifestInfoModal
import View.PageViewModal
import View.Sidebar
import View.Toolbar exposing (viewToolbar)


view : Model -> Html Msg
view model =
    div [ id model.rootElementId ]
        [ div
            [ classList
                [ ( "diva-app", True )
                , ( "is-fullscreen", model.fullscreen )
                ]
            ]
            [ viewManifestTitle model
            , div [ HA.class "diva-app-header" ]
                [ viewToolbar model
                ]
            , div
                [ classList
                    [ ( "diva-app-body", True )
                    , ( "is-fullscreen", model.fullscreen )
                    ]
                ]
                [ View.CollectionExplorer.viewCollectionSidebar model
                , View.CollectionExplorer.viewCollectionResizer model
                , div
                    [ classList
                        [ ( "diva-canvas-column", True )
                        , ( "is-fullscreen", model.fullscreen )
                        ]
                    ]
                    [ viewCanvas model.fullscreen model.isViewerLoading (hasCollectionSidebar model)
                    ]
                , View.Sidebar.viewSidebarResizer model
                , View.Sidebar.viewSidebarPanel model
                ]
            , div [ HA.class "required-statement-dock" ]
                [ viewRequiredStatement model ]
            , View.PageViewModal.viewPageViewModal model
            , View.ManifestInfoModal.viewManifestInfoModal model
            ]
        ]


viewManifestTitle : Model -> Html Msg
viewManifestTitle model =
    viewIf
        (viewMaybe
            (\manifest ->
                let
                    labelText =
                        toLabel manifest
                            |> extractLabelFromLanguageMap model.detectedLanguage
                in
                viewIf
                    (h1
                        [ classList
                            [ ( "diva-app-title", True )
                            , ( "is-fullscreen", model.fullscreen )
                            ]
                        ]
                        [ text labelText ]
                    )
                    (not (String.isEmpty labelText))
            )
            (currentManifest model)
        )
        model.showTitle


viewRequiredStatement : Model -> Html Msg
viewRequiredStatement model =
    viewMaybe
        (\manifest ->
            viewMaybe
                (\statement ->
                    let
                        valueText =
                            extractLabelFromLanguageMap model.detectedLanguage statement.value
                    in
                    viewIf
                        (div
                            [ HA.class "required-statement" ]
                            (HtmlRenderer.renderHtml valueText)
                        )
                        (not (String.isEmpty valueText))
                )
                (toRequiredStatement manifest)
        )
        (currentManifest model)


viewCanvas : Bool -> Bool -> Bool -> Html Msg
viewCanvas fullscreen isLoading showCollectionSidebar =
    div [ HA.class "diva-canvas-wrapper" ]
        [ node "osd-viewer"
            [ classList
                [ ( "diva-canvas", True )
                , ( "is-fullscreen", fullscreen )
                , ( "has-collection", showCollectionSidebar )
                ]
            , id "main-viewer"
            ]
            []
        , viewIf viewThrobber isLoading
        ]


viewThrobber : Html Msg
viewThrobber =
    let
        delays =
            [ 0.2
            , 0.3
            , 0.4
            , 0.1
            , 0.2
            , 0.3
            , 0.0
            , 0.1
            , 0.2
            ]
    in
    div
        [ HA.class "throbber-overlay" ]
        [ div
            [ HA.class "throbber" ]
            (List.map
                (\delay ->
                    div
                        [ HA.class "throbber-cube"
                        , HA.style "animation-delay" (String.fromFloat delay ++ "s")
                        ]
                        []
                )
                delays
            )
        ]


hasCollectionSidebar : Model -> Bool
hasCollectionSidebar model =
    case model.resourceResponse of
        ResourceLoadedCollection _ ->
            model.collectionSidebarVisible

        _ ->
            False
