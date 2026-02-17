module View.Sidebar exposing (viewSidebarPanel, viewSidebarResizer)

import Dict exposing (Dict)
import Html exposing (Html, a, button, div, img, li, text, ul)
import Html.Attributes as HA exposing (alt, attribute, classList, id, src, type_)
import Html.Events as Events
import Html.Lazy as Lazy
import IIIF.Language exposing (LabelValue, Language(..), extractLabelFromLanguageMap)
import IIIF.Presentation exposing (IIIFManifest, MediaFormats, Range, RangeItem(..), ResourceTypes, ViewingDirection(..), canvasLabel, toCanvases, toHomepage, toMetadata, toRanges, toViewingDirection)
import Json.Decode as Decode
import Model exposing (ContentsView(..), Model, Page, ResourceResponse(..), Response(..), SidebarState(..), ViewMode(..), currentManifest, pageViewStartIndex, primaryImage)
import Msg exposing (Msg(..))
import View.Helpers exposing (viewMaybe)
import View.HtmlRenderer exposing (renderHtml)


viewSidebarPanel : Model -> Html Msg
viewSidebarPanel model =
    currentManifest model
        |> viewMaybe (viewSidebarPanelWithManifest model)


viewSidebarPanelWithManifest : Model -> IIIFManifest -> Html Msg
viewSidebarPanelWithManifest model manifest =
    let
        hasContents =
            toRanges manifest
                |> Maybe.map (List.isEmpty >> not)
                |> Maybe.withDefault False

        hasMetadata =
            hasManifestMetadata manifest

        panelClasses =
            [ ( "sidebar-panel", True )
            , ( "is-fullscreen", model.fullscreen )
            , ( "is-hidden", not (isSidebarVisible model.sidebarState) )
            , ( "is-overlay", model.mobileSidebarOpen )
            , ( "is-mobile-hidden", not model.mobileSidebarOpen )
            ]

        contentsTab =
            if hasContents then
                [ viewSidebarTab model.sidebarState SidebarContents "Contents" UserToggledContents ]

            else
                []

        metadataTab =
            if hasMetadata then
                [ viewSidebarTab model.sidebarState SidebarMetadata "Metadata" UserToggledMetadata ]

            else
                []

        contentsPane =
            if hasContents then
                [ viewSidebarPane model.sidebarState SidebarContents (viewContentsContent model) ]

            else
                []

        metadataPane =
            if hasMetadata then
                [ viewSidebarPane model.sidebarState SidebarMetadata (viewMetadataContent model) ]

            else
                []
    in
    div
        [ classList panelClasses
        , HA.style "width"
            (if isSidebarVisible model.sidebarState then
                String.fromInt model.sidebarWidth ++ "px"

             else
                "0px"
            )
        ]
        [ div
            [ HA.class "sidebar-tabs" ]
            (viewSidebarTab model.sidebarState SidebarThumbnails "Thumbnails" UserToggledThumbnails
                :: metadataTab
                ++ contentsTab
            )
        , div
            [ HA.class "sidebar-content" ]
            (viewSidebarPane model.sidebarState
                SidebarThumbnails
                (viewThumbnails
                    { fullscreen = model.fullscreen
                    , selectedIndex = model.selectedIndex
                    , shiftByOne = model.shiftByOne
                    , thumbsInstantScroll = model.thumbsInstantScroll
                    , viewMode = model.viewMode
                    , viewingDirection = toViewingDirection manifest
                    }
                    model.pages
                )
                :: metadataPane
                ++ contentsPane
            )
        ]


viewSidebarResizer : Model -> Html Msg
viewSidebarResizer model =
    viewMaybe
        (\_ ->
            div
                [ classList
                    [ ( "sidebar-resizer", True )
                    , ( "is-hidden", not (isSidebarVisible model.sidebarState) )
                    ]
                , Events.on "mousedown"
                    (Decode.field "clientX" Decode.int
                        |> Decode.map UserStartedSidebarResize
                    )
                ]
                [ text "⋮" ]
        )
        (currentManifest model)


isSidebarVisible : SidebarState -> Bool
isSidebarVisible state =
    state /= SidebarHidden


viewSidebarTab : SidebarState -> SidebarState -> String -> Msg -> Html Msg
viewSidebarTab current target label msg =
    button
        [ classList
            [ ( "sidebar-tab-button", True )
            , ( "is-active", current == target )
            ]
        , type_ "button"
        , Events.onClick msg
        ]
        [ text label ]


viewSidebarPane : SidebarState -> SidebarState -> Html Msg -> Html Msg
viewSidebarPane current target content =
    div
        [ classList
            [ ( "sidebar-pane", True )
            , ( "is-hidden", current /= target )
            ]
        ]
        [ content ]


viewThumbnails :
    { fullscreen : Bool
    , selectedIndex : Maybe Int
    , shiftByOne : Bool
    , thumbsInstantScroll : Bool
    , viewMode : ViewMode
    , viewingDirection : ViewingDirection
    }
    -> List Page
    -> Html Msg
viewThumbnails { fullscreen, selectedIndex, shiftByOne, thumbsInstantScroll, viewMode, viewingDirection } pages =
    div
        [ classList
            [ ( "thumbs", True )
            , ( "is-fullscreen", fullscreen )
            ]
        , id "thumbs"
        , HA.style "scroll-behavior"
            (if thumbsInstantScroll then
                "auto"

             else
                "smooth"
            )
        , HA.style "direction"
            (if viewingDirection == RightToLeft then
                "rtl"

             else
                "ltr"
            )
        ]
        (List.indexedMap Tuple.pair pages
            |> List.map (Lazy.lazy4 viewThumbnail viewMode shiftByOne selectedIndex)
        )


viewThumbnail : ViewMode -> Bool -> Maybe Int -> ( Int, Page ) -> Html Msg
viewThumbnail viewMode shiftByOne selectedIndex ( index, page ) =
    let
        isActive =
            isThumbnailActive viewMode shiftByOne selectedIndex index

        attrs =
            [ classList
                [ ( "thumbs-item", True )
                , ( "ui-card", True )
                , ( "ui-card--dark", True )
                , ( "is-active", isActive )
                ]
            , type_ "button"
            , id ("thumb-" ++ String.fromInt index)
            , attribute "data-thumb-index" (String.fromInt index)
            , Events.onClick (UserClickedThumbnail index)
            ]

        thumbUrl =
            primaryImage page
                |> Maybe.map .thumbUrl
                |> Maybe.withDefault ""

        hasChoices =
            List.length page.images > 1
    in
    button attrs
        [ img
            [ HA.class "thumbs-image"
            , src thumbUrl
            , alt ("Page " ++ String.fromInt (index + 1))
            ]
            []
        , div
            [ classList
                [ ( "thumbs-label", True )
                , ( "is-active", isActive )
                ]
            ]
            [ text
                (if hasChoices then
                    page.label ++ " *"

                 else
                    page.label
                )
            ]
        ]


isThumbnailActive : ViewMode -> Bool -> Maybe Int -> Int -> Bool
isThumbnailActive viewMode shiftByOne selectedIndex index =
    case selectedIndex of
        Just selected ->
            case viewMode of
                OneUp ->
                    selected == index

                TwoUp ->
                    if shiftByOne && selected == 0 then
                        index == 0

                    else
                        let
                            startIndex =
                                pageViewStartIndex TwoUp shiftByOne selected
                        in
                        index == startIndex || index == startIndex + 1

        Nothing ->
            False


viewMetadataContent : Model -> Html Msg
viewMetadataContent model =
    div
        [ HA.class "metadata-panel" ]
        (case currentManifest model of
            Just manifest ->
                [ div
                    [ HA.class "metadata-body" ]
                    (metadataEntries model.detectedLanguage manifest
                        ++ homepageEntries model.detectedLanguage manifest
                    )
                ]

            Nothing ->
                [ div
                    [ HA.class "metadata-body" ]
                    [ text "No metadata available." ]
                ]
        )


metadataEntries : Language -> IIIFManifest -> List (Html Msg)
metadataEntries language manifest =
    toMetadata manifest
        |> List.map (metadataEntry language)


homepageEntries : Language -> IIIFManifest -> List (Html Msg)
homepageEntries language manifest =
    case toHomepage manifest of
        Just links ->
            if List.isEmpty links then
                []

            else
                [ div
                    [ HA.class "metadata-item" ]
                    [ div
                        [ HA.class "metadata-label" ]
                        [ text "Homepage" ]
                    , div
                        [ HA.class "metadata-value" ]
                        (List.map (homepageLinkBlock language) links)
                    ]
                ]

        Nothing ->
            []


hasManifestMetadata : IIIFManifest -> Bool
hasManifestMetadata manifest =
    let
        hasMetadataEntries =
            toMetadata manifest
                |> List.isEmpty
                |> not

        hasHomepageEntries =
            case toHomepage manifest of
                Just links ->
                    not (List.isEmpty links)

                Nothing ->
                    False
    in
    hasMetadataEntries || hasHomepageEntries


homepageLinkBlock :
    Language
    ->
        { id : String
        , label : IIIF.Language.LanguageMap
        , format : MediaFormats
        , type_ : ResourceTypes
        }
    -> Html Msg
homepageLinkBlock language page =
    div []
        [ a
            [ HA.href page.id
            , HA.target "_blank"
            , HA.rel "noopener noreferrer"
            ]
            [ extractLabelFromLanguageMap language page.label
                |> text
            ]
        ]


viewContentsContent : Model -> Html Msg
viewContentsContent model =
    let
        maybeManifest =
            currentManifest model

        body =
            case ( model.contentsView, maybeManifest ) of
                ( ContentsIndex, Just manifest ) ->
                    viewContentsIndexBody model manifest

                ( ContentsIndex, Nothing ) ->
                    viewContentsEmptyBody

                ( ContentsPages, Just manifest ) ->
                    viewOnThisPageBody model manifest

                ( ContentsPages, Nothing ) ->
                    viewOnThisPageEmptyBody
    in
    div
        [ HA.class "contents-panel" ]
        [ div [ HA.class "contents-title" ] [ text "Contents" ]
        , viewContentsToggle model.viewMode model.contentsView
        , body
        ]


viewContentsToggle : ViewMode -> ContentsView -> Html Msg
viewContentsToggle viewMode contentsView =
    div
        [ HA.class "contents-view-tabs" ]
        [ button
            [ classList
                [ ( "contents-view-button", True )
                , ( "is-active", contentsView == ContentsIndex )
                ]
            , type_ "button"
            , Events.onClick UserSelectedContentsIndex
            ]
            [ text "Index" ]
        , button
            [ classList
                [ ( "contents-view-button", True )
                , ( "is-active", contentsView == ContentsPages )
                ]
            , type_ "button"
            , Events.onClick UserSelectedContentsPages
            ]
            [ text
                (case viewMode of
                    OneUp ->
                        "On this page"

                    TwoUp ->
                        "On these pages"
                )
            ]
        ]


viewContentsIndexBody : Model -> IIIFManifest -> Html Msg
viewContentsIndexBody model manifest =
    case toRanges manifest of
        Just list ->
            if List.isEmpty list then
                viewContentsEmptyBody

            else
                viewRangeList model model.rangeIndexMap list

        Nothing ->
            viewContentsEmptyBody


viewContentsEmptyBody : Html Msg
viewContentsEmptyBody =
    div
        [ HA.class "contents-empty" ]
        [ text "No contents available." ]


viewOnThisPageBody : Model -> IIIFManifest -> Html Msg
viewOnThisPageBody model manifest =
    case currentCanvasId model manifest of
        Just canvasId ->
            case toRanges manifest of
                Just list ->
                    let
                        matches =
                            rangesForCanvas canvasId list
                    in
                    if List.isEmpty matches then
                        viewOnThisPageEmptyBody

                    else
                        let
                            canvasLabelMap =
                                toCanvases manifest
                                    |> List.map (\canvas -> ( canvas.id, canvasLabel canvas ))
                                    |> Dict.fromList
                        in
                        ul
                            [ classList [ ( "contents-list", True ), ( "list-reset", True ) ] ]
                            (List.map (viewOtpRangeItem model canvasLabelMap) matches)

                Nothing ->
                    viewOnThisPageEmptyBody

        Nothing ->
            viewOnThisPageEmptyBody


viewOnThisPageEmptyBody : Html Msg
viewOnThisPageEmptyBody =
    div
        [ HA.class "contents-empty" ]
        [ text "No ranges for this page." ]


viewOtpRangeItem : Model -> Dict String String -> Range -> Html Msg
viewOtpRangeItem model canvasLabelMap range =
    let
        canvasLabels =
            rangeCanvasLabels canvasLabelMap range

        labelText =
            extractLabelFromLanguageMap model.detectedLanguage range.label

        maybeIndex =
            Dict.get range.id model.rangeIndexMap
                |> Maybe.withDefault Nothing

        firstLabel =
            List.head canvasLabels

        lastLabel =
            List.reverse canvasLabels |> List.head

        rangePrefix =
            case ( firstLabel, lastLabel ) of
                ( Just first, Just last ) ->
                    if first == last then
                        "[" ++ first ++ "] "

                    else
                        "[" ++ first ++ "-" ++ last ++ "] "

                ( Just first, Nothing ) ->
                    "[" ++ first ++ "] "

                ( Nothing, Just last ) ->
                    "[" ++ last ++ "] "

                _ ->
                    ""

        labelNode =
            button
                [ classList [ ( "contents-button", True ), ( "ui-button", True ) ]
                , type_ "button"
                , Events.onClick (UserClickedRange range.id maybeIndex)
                ]
                [ text
                    (if String.isEmpty labelText then
                        rangePrefix ++ "[Untitled range]"

                     else
                        rangePrefix ++ labelText
                    )
                ]

        metadataBlock =
            viewRangeMetadata model.detectedLanguage range.metadata
    in
    li
        [ HA.class "contents-item" ]
        (labelNode :: metadataBlock)


viewRangeList : Model -> Dict String (Maybe Int) -> List Range -> Html Msg
viewRangeList model rangeIndexMap ranges =
    ul
        [ classList [ ( "contents-list", True ), ( "list-reset", True ) ] ]
        (List.map (Lazy.lazy3 viewRangeNode model rangeIndexMap) ranges)


viewRangeNode : Model -> Dict String (Maybe Int) -> Range -> Html Msg
viewRangeNode model rangeIndexMap range =
    let
        labelText =
            extractLabelFromLanguageMap model.detectedLanguage range.label

        maybeIndex =
            Dict.get range.id rangeIndexMap
                |> Maybe.withDefault Nothing

        labelNode =
            button
                [ classList [ ( "contents-button", True ), ( "ui-button", True ) ]
                , type_ "button"
                , Events.onClick (UserClickedRange range.id maybeIndex)
                ]
                [ text
                    (if String.isEmpty labelText then
                        "[Untitled range]"

                     else
                        labelText
                    )
                ]

        metadataBlock =
            if model.selectedRangeId == Just range.id then
                viewRangeMetadata model.detectedLanguage range.metadata

            else
                []

        children =
            viewRangeItems model rangeIndexMap range.items
    in
    li
        [ HA.class "contents-item" ]
        (labelNode :: metadataBlock ++ children)


viewRangeItems : Model -> Dict String (Maybe Int) -> List RangeItem -> List (Html Msg)
viewRangeItems model rangeIndexMap items =
    let
        rendered =
            List.filterMap
                (\item ->
                    case item of
                        RangeCanvas _ ->
                            Nothing

                        RangeRange range ->
                            Just (Lazy.lazy3 viewRangeNode model rangeIndexMap range)
                )
                items
    in
    if List.isEmpty rendered then
        []

    else
        [ ul [ classList [ ( "contents-list-nested", True ), ( "list-reset", True ) ] ] rendered ]


viewRangeMetadata : Language -> List LabelValue -> List (Html Msg)
viewRangeMetadata language metadata =
    if List.isEmpty metadata then
        []

    else
        [ div
            [ HA.class "contents-meta" ]
            (List.map (metadataEntry language) metadata)
        ]


currentCanvasId : Model -> IIIFManifest -> Maybe String
currentCanvasId model manifest =
    model.selectedIndex
        |> Maybe.andThen (\index -> List.drop index (toCanvases manifest) |> List.head)
        |> Maybe.map .id


rangesForCanvas : String -> List Range -> List Range
rangesForCanvas canvasId ranges =
    List.concatMap (rangesForCanvasInRange canvasId) ranges


rangesForCanvasInRange : String -> Range -> List Range
rangesForCanvasInRange canvasId range =
    let
        nested =
            List.concatMap
                (\item ->
                    case item of
                        RangeCanvas _ ->
                            []

                        RangeRange child ->
                            rangesForCanvasInRange canvasId child
                )
                range.items
    in
    if rangeContainsCanvas canvasId range then
        range :: nested

    else
        nested


rangeContainsCanvas : String -> Range -> Bool
rangeContainsCanvas canvasId range =
    List.any (rangeItemContainsCanvas canvasId) range.items


rangeItemContainsCanvas : String -> RangeItem -> Bool
rangeItemContainsCanvas canvasId item =
    case item of
        RangeCanvas idValue ->
            idValue == canvasId

        RangeRange range ->
            rangeContainsCanvas canvasId range


rangeCanvasLabels : Dict String String -> Range -> List String
rangeCanvasLabels canvasLabelMap range =
    rangeCanvasIds range.items
        |> List.filterMap (\idValue -> Dict.get idValue canvasLabelMap)


rangeCanvasIds : List RangeItem -> List String
rangeCanvasIds items =
    let
        step pending acc =
            case pending of
                [] ->
                    List.reverse acc

                [] :: restStacks ->
                    step restStacks acc

                (item :: rest) :: restStacks ->
                    case item of
                        RangeCanvas idValue ->
                            step (rest :: restStacks) (idValue :: acc)

                        RangeRange range ->
                            step (range.items :: rest :: restStacks) acc
    in
    step [ items ] []


metadataEntry : Language -> LabelValue -> Html Msg
metadataEntry language entry =
    div
        [ HA.class "metadata-item" ]
        [ div
            [ HA.class "metadata-label" ]
            [ extractLabelFromLanguageMap language entry.label |> text ]
        , div
            [ HA.class "metadata-value" ]
            (extractLabelFromLanguageMap language entry.value |> renderHtml)
        ]
