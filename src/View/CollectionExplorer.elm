module View.CollectionExplorer exposing (viewCollectionResizer, viewCollectionSidebar)

import Html exposing (Html, button, div, li, text, ul)
import Html.Attributes as Attr exposing (classList, type_)
import Html.Events as Events
import Html.Lazy as Lazy
import IIIF.Language exposing (Language(..), extractLabelFromLanguageMap)
import IIIF.Presentation exposing (Collection, CollectionItem(..), IIIFCollection(..), Manifest)
import Json.Decode as Decode
import Model exposing (CollectionState, Model, ResourceResponse(..))
import Msg exposing (Msg(..))
import Set
import View.Helpers exposing (viewMaybe)


viewCollectionSidebar : Model -> Html Msg
viewCollectionSidebar model =
    let
        maybeCollectionState =
            case model.resourceResponse of
                ResourceLoadedCollection collectionState ->
                    Just collectionState

                _ ->
                    Nothing
    in
    viewMaybe (viewCollectionPanel model) maybeCollectionState


viewCollectionPanel : Model -> CollectionState -> Html Msg
viewCollectionPanel model collectionState =
    let
        (IIIFCollection _ collection) =
            collectionState.collection

        labelText =
            extractLabelFromLanguageMap model.detectedLanguage collection.label

        summaryText =
            collection.summary
                |> Maybe.map (extractLabelFromLanguageMap model.detectedLanguage)
    in
    div
        [ classList
            [ ( "collection-panel", True )
            , ( "is-fullscreen", model.fullscreen )
            , ( "is-hidden", not model.collectionSidebarVisible )
            ]
        , Attr.style "width"
            (if model.collectionSidebarVisible then
                String.fromInt model.collectionSidebarWidth ++ "px"

             else
                "0px"
            )
        ]
        [ div
            [ classList [ ( "collection-header", True ) ] ]
            [ div [ classList [ ( "collection-title", True ) ] ] [ text labelText ]
            , viewMaybe
                (\summary ->
                    div [ classList [ ( "collection-summary", True ) ] ] [ text summary ]
                )
                summaryText
            ]
        , div
            [ classList [ ( "sidebar-content", True ) ] ]
                [ div
                    [ classList [ ( "sidebar-pane", True ), ( "is-scroll", True ) ] ]
                    [ viewCollectionTree model.detectedLanguage collectionState collection.items ]
                ]
        ]


viewCollectionTree : Language -> CollectionState -> List CollectionItem -> Html Msg
viewCollectionTree language collectionState items =
    ul
        [ classList [ ( "collection-list", True ), ( "list-reset", True ) ] ]
        (List.map (Lazy.lazy3 viewCollectionItem language collectionState) items)


viewCollectionItem : Language -> CollectionState -> CollectionItem -> Html Msg
viewCollectionItem language collectionState item =
    case item of
        NestedCollection collection ->
            viewNestedCollection language collectionState collection

        ManifestItem manifest ->
            viewManifestItem language collectionState manifest


viewNestedCollection : Language -> CollectionState -> Collection -> Html Msg
viewNestedCollection language collectionState collection =
    let
        isExpanded =
            Set.member collection.id collectionState.expandedIds

        labelText =
            extractLabelFromLanguageMap language collection.label

        expandIcon =
            if isExpanded then
                "▼"

            else
                "▶"

        childrenView =
            if isExpanded then
                let
                    isLoading =
                        Set.member collection.id collectionState.loadingCollectionIds

                    loadingView =
                        if isLoading then
                            [ div [ classList [ ( "contents-empty", True ) ] ] [ text "Loading…" ] ]

                        else
                            []
                in
                viewCollectionTree language collectionState collection.items :: loadingView

            else
                []
    in
    li
        [ classList [ ( "collection-tree-item", True ) ] ]
        (button
            [ classList [ ( "collection-node-button", True ), ( "ui-button", True ) ]
            , type_ "button"
            , Events.onClick (UserClickedCollectionItem collection.id)
            ]
            [ div [ classList [ ( "collection-expand-icon", True ) ] ] [ text expandIcon ]
            , text labelText
            ]
            :: childrenView
        )


viewManifestItem : Language -> CollectionState -> Manifest -> Html Msg
viewManifestItem language collectionState manifest =
    let
        labelText =
            extractLabelFromLanguageMap language manifest.label

        isActive =
            collectionState.selectedManifestId == Just manifest.id
    in
    li []
        [ button
            [ classList
                [ ( "manifest-tree-item", True )
                , ( "ui-button", True )
                , ( "is-active", isActive )
                ]
            , type_ "button"
            , Events.onClick (UserClickedManifestItem manifest.id manifest.id)
            ]
            [ text labelText ]
        ]


viewCollectionResizer : Model -> Html Msg
viewCollectionResizer model =
    let
        maybeResizer =
            case model.resourceResponse of
                ResourceLoadedCollection _ ->
                    Just
                        (div
                            [ classList
                                [ ( "collection-resizer", True )
                                , ( "is-hidden", not model.collectionSidebarVisible )
                                ]
                            , Events.on "mousedown"
                                (Decode.field "clientX" Decode.int
                                    |> Decode.map UserStartedCollectionSidebarResize
                                )
                            ]
                            [ text "⋮" ]
                        )

                _ ->
                    Nothing
    in
    viewMaybe identity maybeResizer
