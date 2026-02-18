module View exposing (view)

import Html exposing (Html, div, h1, node, text)
import Html.Attributes as HA exposing (classList, id)
import Html.Lazy as Lazy
import IIIF.Language exposing (extractLabelFromLanguageMap)
import IIIF.Presentation exposing (toLabel, toRequiredStatement)
import Model exposing (Model, ResourceResponse(..), Response(..), currentManifest)
import Msg exposing (Msg)
import View.CollectionExplorer
import View.Helpers exposing (emptyHtml, viewIf, viewMaybe)
import View.HtmlRenderer as HtmlRenderer
import View.ManifestInfoModal
import View.PageViewModal
import View.Sidebar
import View.Toolbar exposing (viewToolbar)


view : Model -> Html Msg
view model =
    let
        maybeStatus =
            viewerStatus model
    in
    div [ id model.rootElementId ]
        [ div
            [ classList
                [ ( "diva-app", True )
                , ( "is-fullscreen", model.fullscreen )
                ]
            ]
            [ Lazy.lazy3 viewManifestTitle
                model.showTitle
                model.fullscreen
                (manifestTitleFor model)
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
                    [ Lazy.lazy5 viewCanvas
                        model.fullscreen
                        (isCanvasLoading model)
                        (hasCollectionSidebar model)
                        maybeStatus
                        (zoomPercentageLabel model)
                    ]
                , View.Sidebar.viewSidebarResizer model
                , View.Sidebar.viewSidebarPanel model
                ]
            , div [ HA.class "required-statement-dock" ]
                [ viewMaybe (Lazy.lazy viewRequiredStatement) (requiredStatementTextFor model) ]
            , View.PageViewModal.viewPageViewModal model
            , View.ManifestInfoModal.viewManifestInfoModal model
            ]
        ]


hasCollectionSidebar : Model -> Bool
hasCollectionSidebar model =
    case model.resourceResponse of
        ResourceLoadedCollection _ ->
            model.collectionSidebarVisible

        _ ->
            False


isCanvasLoading : Model -> Bool
isCanvasLoading model =
    (model.isViewerLoading || model.resourceResponse == ResourceLoading) || (model.response == Loading)


manifestTitleFor : Model -> String
manifestTitleFor model =
    currentManifest model
        |> Maybe.map (\manifest -> toLabel manifest |> extractLabelFromLanguageMap model.detectedLanguage)
        |> Maybe.withDefault ""


requiredStatementTextFor : Model -> Maybe String
requiredStatementTextFor model =
    currentManifest model
        |> Maybe.andThen toRequiredStatement
        |> Maybe.map (\statement -> extractLabelFromLanguageMap model.detectedLanguage statement.value)


viewCanvas : Bool -> Bool -> Bool -> Maybe ( String, String, Bool ) -> Maybe String -> Html Msg
viewCanvas fullscreen isLoading showCollectionSidebar maybeStatus maybeZoomLabel =
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
        , viewMaybe viewViewerStatusModal maybeStatus
        , viewMaybe viewZoomIndicator maybeZoomLabel
        ]


viewManifestTitle : Bool -> Bool -> String -> Html Msg
viewManifestTitle showTitle fullscreen title =
    if showTitle && not (String.isEmpty title) then
        h1
            [ classList
                [ ( "diva-app-title", True )
                , ( "is-fullscreen", fullscreen )
                ]
            ]
            [ text title ]

    else
        emptyHtml


viewRequiredStatement : String -> Html Msg
viewRequiredStatement valueText =
    if String.isEmpty valueText then
        emptyHtml

    else
        div
            [ HA.class "required-statement" ]
            (HtmlRenderer.renderHtml valueText)


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


viewViewerStatusModal : ( String, String, Bool ) -> Html Msg
viewViewerStatusModal ( titleText, message, isError ) =
    div
        [ HA.class "viewer-status-overlay" ]
        [ div
            [ HA.class "modal is-narrow" ]
            [ div
                [ HA.class "modal-header" ]
                [ div [ HA.class "modal-title" ] [ text titleText ] ]
            , div
                [ HA.class "modal-body is-no-sidebar" ]
                [ div
                    [ classList [ ( "status", True ), ( "is-error", isError ) ] ]
                    [ text message ]
                ]
            ]
        ]


viewZoomIndicator : String -> Html Msg
viewZoomIndicator zoomText =
    div [ HA.class "viewer-zoom-indicator" ] [ text zoomText ]


viewerStatus : Model -> Maybe ( String, String, Bool )
viewerStatus model =
    case model.resourceResponse of
        ResourceLoadedManifest _ ->
            if model.hasTileSources then
                Nothing

            else
                Just ( "Unable to display manifest", "No canvases found in this manifest.", False )

        ResourceLoadedCollection _ ->
            case model.response of
                Failed message ->
                    Just ( "Unable to load manifest", message, True )

                _ ->
                    if model.hasTileSources then
                        Nothing

                    else
                        Just ( "No Manifest Selected", "Select a manifest from the collection to view.", False )

        ResourceFailed message ->
            Just ( "Unable to load manifest", message, True )

        _ ->
            Nothing


zoomPercentageLabel : Model -> Maybe String
zoomPercentageLabel model =
    case ( model.initialZoom, model.currentZoom ) of
        ( Just initialZoom, Just currentZoom ) ->
            if initialZoom > 0 then
                let
                    percent =
                        (currentZoom / initialZoom) * 100
                in
                Just (String.fromInt (round percent) ++ "%")

            else
                Nothing

        _ ->
            Nothing
