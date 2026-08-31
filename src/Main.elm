port module Main exposing (Flags, main)

import Annotation
import Auth
import Browser
import Browser.Dom as Dom
import Browser.Events
import Dict exposing (Dict)
import Filters exposing (Filters, applyFilterToggle, applyFloatFilter, applyIntFilter, applyStringFilter, decodeFilterJson, encodeActiveFilters, resetAltColourAdjust, resetFilters, updateFilters)
import Http
import IIIF
import IIIF.Annotation as IIIFAnnotation
import IIIF.Language exposing (Language(..))
import IIIF.Presentation exposing (AnnotationSource(..), Collection, CollectionItem(..), IIIFCollection(..), IIIFManifest(..), IIIFResource(..), Range, RangeItem(..), ViewingDirection(..), isPagedLayout, manifestViewingLayout, toCanvases, toHomepage, toMetadata, toRanges, toViewingDirection)
import IIIF.Version
import Json.Decode as Decode
import Json.Encode as Encode
import Model exposing (ContentsView(..), Model, ResourceResponse(..), Response(..), SidebarState(..), ViewMode(..), currentManifest, getPageAt, manifestToPages, primaryImage)
import Msg exposing (Msg(..))
import Process
import Set
import Task
import Url.Builder
import View


port annotationsUpdated : { canvasId : String, annotations : List Encode.Value } -> Cmd msg


port annotationsVisibilityUpdated : Bool -> Cmd msg


port authDestroyed : (() -> msg) -> Sub msg


port authHttpCancelled : String -> Cmd msg


port authHttpFailed : ({ id : String, message : String } -> msg) -> Sub msg


port authHttpRequested : Encode.Value -> Cmd msg


port authHttpResponded : ({ id : String, status : Int, body : String } -> msg) -> Sub msg


port authLogoutChanged : ({ sessionId : String, status : String } -> msg) -> Sub msg


port authPopupChanged : ({ flowId : String, status : String } -> msg) -> Sub msg


port authSourcesInvalidated : List String -> Cmd msg


port authStorageRequested : Encode.Value -> Cmd msg


port authStorageResponded : ({ flowId : String, now : Float, value : Maybe Decode.Value } -> msg) -> Sub msg


port authTokenFailed : ({ flowId : String, message : String } -> msg) -> Sub msg


port authTokenFrameCancelled : String -> Cmd msg


port authTokenFrameRequested : Encode.Value -> Cmd msg


port authTokenMessage : ({ flowId : String, now : Float, value : Decode.Value } -> msg) -> Sub msg


port copyToClipboard : String -> Cmd msg


port filterPreviewUpdated :
    Maybe
        { sourceId : String
        , tileSource : String
        , isStatic : Bool
        , aspect : Float
        , filters : Filters
        }
    -> Cmd msg


port fullscreenChanged : (Bool -> msg) -> Sub msg


port layoutConfigUpdated : { mode : String, direction : String } -> Cmd msg


port layoutModeRequested : (String -> msg) -> Sub msg


port layoutModeUpdated : String -> Cmd msg


port pageAspectsUpdated : List Float -> Cmd msg


port pageIndexChanged : (Int -> msg) -> Sub msg


port pageIndexChangedInstant : (Int -> msg) -> Sub msg


port pageLabelsUpdated : List String -> Cmd msg


port pagesUpdated :
    List
        { index : Int
        , canvasId : String
        , label : String
        , width : Maybe Int
        , height : Maybe Int
        , primaryImage : { id : String, label : String, isPrimary : Bool }
        , images : List { id : String, label : String, isPrimary : Bool }
        }
    -> Cmd msg


port resolveTileSourceCancelled : (String -> msg) -> Sub msg


port resolveTileSourceRequested : ({ requestId : String, sourceId : String } -> msg) -> Sub msg


port resourceLoadFailed : { requestId : String, url : String, message : String } -> Cmd msg


port resourceLoadSucceeded : { requestId : String, url : String, hasPages : Bool, pageIndex : Int } -> Cmd msg


port resourceRequested : ({ requestId : String, url : String } -> msg) -> Sub msg


port saveFilteredImage : () -> Cmd msg


port scrollToIndex : Int -> Cmd msg


port setFullscreen : Bool -> Cmd msg


port tileSourceResolutionFailed : { requestId : String, message : String } -> Cmd msg


port tileSourceResolutionSucceeded : Encode.Value -> Cmd msg


port tileSourcesUpdated : { resourceId : String, tileSources : List { sourceId : String, url : String, isStatic : Bool, canvasId : String }, initialPageIndex : Int } -> Cmd msg


port viewerLoadingChanged : (Bool -> msg) -> Sub msg


port viewerPageLoaded : (Int -> msg) -> Sub msg


port zoomBy : Float -> Cmd msg


port zoomChanged : (Float -> msg) -> Sub msg


port zoomLevelUpdated : Float -> Cmd msg


type alias Flags =
    { rootElementId : String
    , objectData : String
    , initialPage : Decode.Value
    , acceptHeaders : List String
    , showSidebar : Bool
    , sidebarWidth : Int
    , sidebarPanel : String
    , showTitle : Bool
    , userLanguage : String
    , enableAnnotations : Bool
    , annotationServer : Maybe String
    }


main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , subscriptions = subscriptions
        , update = update
        , view = View.view
        }


annotationImageServiceForCanvas : String -> Model -> Maybe String
annotationImageServiceForCanvas canvasId model =
    model.pages
        |> List.filter (\page -> page.canvasId == canvasId)
        |> List.head
        |> Maybe.andThen primaryImage
        |> Maybe.andThen
            (\image ->
                if image.isStatic || Auth.requiresAuthorization image.auth then
                    Nothing

                else
                    Just image.tileSource
            )


annotationServerUrl : String -> String -> String -> String
annotationServerUrl server canvasId version =
    let
        query =
            Url.Builder.toQuery
                [ Url.Builder.string "canvasURI" canvasId
                , Url.Builder.string "iiifVersion" version
                ]
    in
    if String.contains "?" server then
        server ++ "&" ++ String.dropLeft 1 query

    else
        server ++ query


annotationSourcesForManifest : IIIFManifest -> Dict String (List AnnotationSource)
annotationSourcesForManifest manifest =
    toCanvases manifest
        |> List.map (\canvas -> ( canvas.id, canvas.annotationSources ))
        |> Dict.fromList


buildRangeIndexMap : Dict String Int -> List Range -> Dict String (Maybe Int)
buildRangeIndexMap canvasIndex ranges =
    List.foldl
        (\range acc ->
            Dict.union (rangeIndexMapForRange canvasIndex range) acc
        )
        Dict.empty
        ranges


clearViewer : String -> Cmd msg
clearViewer resourceId =
    Cmd.batch
        [ tileSourcesUpdated { resourceId = resourceId, tileSources = [], initialPageIndex = 0 }
        , pagesUpdated []
        , pageAspectsUpdated []
        , pageLabelsUpdated []
        , filterPreviewUpdated Nothing
        , annotationsUpdated { canvasId = "", annotations = [] }
        ]


findCollectionById : String -> Collection -> Maybe Collection
findCollectionById collectionId collection =
    let
        loop state stack =
            if state.collection.id == collectionId then
                Just state.collection

            else
                case state.rest of
                    [] ->
                        case stack of
                            [] ->
                                Nothing

                            frame :: rest ->
                                loop frame rest

                    item :: rest ->
                        case item of
                            NestedCollection nested ->
                                loop
                                    { collection = nested
                                    , rest = nested.items
                                    }
                                    ({ collection = state.collection, rest = rest } :: stack)

                            ManifestItem _ ->
                                loop { state | rest = rest } stack
    in
    loop { collection = collection, rest = collection.items } []


findPageIndex : (Model.Page -> Bool) -> List Model.Page -> Maybe Int
findPageIndex predicate pages =
    pages
        |> List.indexedMap Tuple.pair
        |> List.filter (Tuple.second >> predicate)
        |> List.head
        |> Maybe.map Tuple.first


handleManifestLoaded : String -> Maybe Decode.Value -> Model -> IIIFManifest -> ( Model, Cmd Msg )
handleManifestLoaded resourceId initialPage model manifest =
    let
        pagedLayout =
            manifestViewingLayout manifest
                |> isPagedLayout

        viewingDirection =
            toViewingDirection manifest

        isSingleCanvas =
            List.length pages == 1

        availableSidebarPanel =
            sidebarPanelForManifest manifest model.sidebarPanel

        nextSidebarState =
            if model.sidebarState == SidebarHidden then
                SidebarHidden

            else
                availableSidebarPanel

        pages =
            manifestToPages model.detectedLanguage manifest

        initialPageIndex =
            resolveInitialPageIndex initialPage pages

        tileSources =
            List.filterMap
                (\page ->
                    primaryImage page
                        |> Maybe.map
                            (\image ->
                                { sourceId = image.sourceId
                                , url = image.tileSource
                                , isStatic = image.isStatic
                                , canvasId = page.canvasId
                                }
                            )
                )
                pages

        authSources =
            pages
                |> List.concatMap .images
                |> List.map
                    (\image ->
                        { id = image.sourceId
                        , url = image.tileSource
                        , isStatic = image.isStatic
                        , auth = image.auth
                        }
                    )

        pageAspects =
            List.map .aspect pages

        viewMode =
            if isSingleCanvas then
                OneUp

            else if pagedLayout then
                TwoUp

            else
                OneUp

        shiftByOne =
            if isSingleCanvas then
                False

            else
                pagedLayout || viewingDirection == RightToLeft

        layoutMode =
            layoutModeToString viewMode shiftByOne

        direction =
            viewingDirectionToString viewingDirection

        canvasIndexMap =
            toCanvases manifest
                |> List.indexedMap (\index canvas -> ( canvas.id, index ))
                |> Dict.fromList

        rangeIndexMap =
            toRanges manifest
                |> Maybe.map (buildRangeIndexMap canvasIndexMap)
                |> Maybe.withDefault Dict.empty
    in
    ( { model
        | currentZoom = Nothing
        , annotationSources = annotationSourcesForManifest manifest
        , annotationLoading = Set.empty
        , annotationsByCanvas = Dict.empty
        , auth = Auth.registerSources authSources Auth.init
        , filters = resetFilters
        , hasTileSources = not (List.isEmpty tileSources)
        , initialZoom = Nothing
        , isViewerLoading = False
        , pageViewOpen = False
        , pages = pages
        , rangeIndexMap = rangeIndexMap
        , response = Loaded manifest
        , sidebarPanel = availableSidebarPanel
        , sidebarState = nextSidebarState
        , selectedIndex =
            if List.isEmpty pages then
                Nothing

            else
                Just initialPageIndex
        , shiftByOne = shiftByOne
        , viewMode = viewMode
      }
    , Cmd.batch
        [ tileSourcesUpdated { resourceId = resourceId, tileSources = tileSources, initialPageIndex = initialPageIndex }
        , pagesUpdated (publicPages pages)
        , filterPreviewUpdated Nothing
        , pageAspectsUpdated pageAspects
        , pageLabelsUpdated (List.map .label pages)
        , zoomLevelUpdated 1
        , layoutConfigUpdated { direction = direction, mode = layoutMode }
        ]
    )


handlePageChanged : Bool -> Int -> Model -> ( Model, Cmd Msg )
handlePageChanged instant index model =
    let
        nextModel =
            { model
                | pageViewImageIndex = 0
                , selectedIndex = Just index
                , thumbsInstantScroll = instant
            }
    in
    ( nextModel
    , Cmd.batch
        [ scrollThumbsToIndex (nextModel.sidebarState == SidebarThumbnails) index
        , sendPageViewPreview nextModel
        ]
    )


handlePageViewStep : Int -> Model -> ( Model, Cmd Msg )
handlePageViewStep delta model =
    case model.selectedIndex of
        Just index ->
            let
                nextIndex =
                    index + delta
            in
            if nextIndex >= 0 && nextIndex < List.length model.pages then
                let
                    nextModel =
                        { model
                            | pageViewImageIndex = 0
                            , selectedIndex = Just nextIndex
                            , thumbsInstantScroll = False
                        }
                in
                ( nextModel
                , Cmd.batch
                    [ scrollToIndex nextIndex
                    , scrollThumbsToIndex (nextModel.sidebarState == SidebarThumbnails) nextIndex
                    , sendPageViewPreview nextModel
                    ]
                )

            else
                ( model, Cmd.none )

        Nothing ->
            ( model, Cmd.none )


httpErrorToString : Http.Error -> String
httpErrorToString err =
    case err of
        Http.BadUrl url ->
            "Bad URL: " ++ url

        Http.Timeout ->
            "Request timed out."

        Http.NetworkError ->
            "Network error. The resource may be unreachable or blocked by CORS."

        Http.BadStatus statusCode ->
            "HTTP error: " ++ String.fromInt statusCode

        Http.BadBody _ ->
            "Invalid IIIF response body. URL did not return a valid IIIF Manifest or Collection JSON."


init : Flags -> ( Model, Cmd Msg )
init flags =
    let
        manifestUrl =
            flags.objectData

        sidebarPanel =
            sidebarPanelFromString flags.sidebarPanel

        sidebarState =
            if flags.showSidebar then
                sidebarPanel

            else
                SidebarHidden

        userLanguage =
            LanguageCode flags.userLanguage
    in
    ( { acceptHeaders = flags.acceptHeaders
      , auth = Auth.init
      , collectionSidebarDrag = Nothing
      , collectionSidebarVisible = True
      , collectionSidebarWidth = 400
      , contentsView = ContentsIndex
      , currentZoom = Nothing
      , detectedLanguage = userLanguage
      , enableAnnotations = flags.enableAnnotations
      , annotationServer = flags.annotationServer
      , annotationsVisible = flags.enableAnnotations
      , annotationSources = Dict.empty
      , annotationLoading = Set.empty
      , annotationsByCanvas = Dict.empty
      , filterGroupExpanded = Set.empty
      , filters = resetFilters
      , filtersJsonError = Nothing
      , filtersJsonInput = ""
      , fullscreen = False
      , hasTileSources = False
      , initialZoom = Nothing
      , initialPage = flags.initialPage
      , initialResourceSuperseded = False
      , isMobile = False
      , isViewerLoading = False
      , manifestInfoOpen = False
      , manifestUrl = manifestUrl
      , mobileSidebarOpen = False
      , pageViewFullscreen = False
      , pageViewImageIndex = 0
      , pageViewOpen = False
      , pageViewSidebarVisible = True
      , pages = []
      , pendingThumbScroll = Nothing
      , pendingPublicResource = Nothing
      , rangeIndexMap = Dict.empty
      , resourceResponse = ResourceLoading
      , response = Loading
      , rootElementId = flags.rootElementId
      , selectedIndex = Nothing
      , selectedRangeId = Nothing
      , shiftByOne = False
      , showTitle = flags.showTitle
      , sidebarDrag = Nothing
      , sidebarPanel = sidebarPanel
      , sidebarState = sidebarState
      , sidebarWidth = clamp 220 520 flags.sidebarWidth
      , thumbsInstantScroll = False
      , viewMode = OneUp
      }
    , Cmd.batch
        [ IIIF.requestResource ServerRespondedWithResource flags.acceptHeaders manifestUrl
        , Task.perform (\viewport -> ViewportChanged (round viewport.viewport.width)) Dom.getViewport
        ]
    )


type InitialPageTarget
    = InitialPageIndex Int
    | InitialPageCanvasId String
    | InitialPageLabel String


initialPageTargetDecoder : Decode.Decoder InitialPageTarget
initialPageTargetDecoder =
    Decode.oneOf
        [ Decode.map InitialPageIndex Decode.int
        , Decode.field "by" Decode.string
            |> Decode.andThen
                (\by ->
                    case by of
                        "canvasId" ->
                            Decode.map InitialPageCanvasId (Decode.field "value" Decode.string)

                        "label" ->
                            Decode.map InitialPageLabel (Decode.field "value" Decode.string)

                        _ ->
                            Decode.fail "Unsupported initial page selector"
                )
        ]


layoutModeToString : ViewMode -> Bool -> String
layoutModeToString viewMode shiftByOne =
    case viewMode of
        OneUp ->
            "single"

        TwoUp ->
            if shiftByOne then
                "spread-shift"

            else
                "spread"


logoutEvent : { sessionId : String, status : String } -> Msg
logoutEvent change =
    AuthEvent
        (case change.status of
            "closed" ->
                Auth.LogoutClosed

            "opened" ->
                Auth.LogoutOpened change.sessionId

            _ ->
                Auth.LogoutBlocked change.sessionId
        )


mobileWidthBreakpoint : Int
mobileWidthBreakpoint =
    720


popupEvent : { flowId : String, status : String } -> Msg
popupEvent change =
    AuthEvent
        (case change.status of
            "closed" ->
                Auth.PopupClosed change.flowId

            "opened" ->
                Auth.PopupOpened change.flowId

            _ ->
                Auth.PopupBlocked change.flowId
        )


publicPages :
    List Model.Page
    ->
        List
            { index : Int
            , canvasId : String
            , label : String
            , width : Maybe Int
            , height : Maybe Int
            , primaryImage : { id : String, label : String, isPrimary : Bool }
            , images : List { id : String, label : String, isPrimary : Bool }
            }
publicPages pages =
    pages
        |> List.indexedMap
            (\index page ->
                primaryImage page
                    |> Maybe.map
                        (\primary ->
                            { index = index
                            , canvasId = page.canvasId
                            , label = page.label
                            , width = page.width
                            , height = page.height
                            , primaryImage = { id = primary.id, label = primary.label, isPrimary = primary.isPrimary }
                            , images =
                                List.map
                                    (\image -> { id = image.id, label = image.label, isPrimary = image.isPrimary })
                                    page.images
                            }
                        )
            )
        |> List.filterMap identity


rangeIndexMapForRange :
    Dict String Int
    -> Range
    -> Dict String (Maybe Int)
rangeIndexMapForRange canvasIndex range =
    let
        ( firstIndex, childMap ) =
            rangeItemsIndexMap canvasIndex range.items
    in
    Dict.insert range.id firstIndex childMap


rangeItemsIndexMap :
    Dict String Int
    -> List RangeItem
    -> ( Maybe Int, Dict String (Maybe Int) )
rangeItemsIndexMap canvasIndex items =
    List.foldl
        (\item ( maybeFirst, acc ) ->
            case item of
                RangeCanvas canvasId ->
                    let
                        nextFirst =
                            case maybeFirst of
                                Just _ ->
                                    maybeFirst

                                Nothing ->
                                    Dict.get canvasId canvasIndex
                    in
                    ( nextFirst, acc )

                RangeRange range ->
                    let
                        rangeMap =
                            rangeIndexMapForRange canvasIndex range

                        nextFirst =
                            case maybeFirst of
                                Just _ ->
                                    maybeFirst

                                Nothing ->
                                    Dict.get range.id rangeMap
                                        |> Maybe.withDefault Nothing
                    in
                    ( nextFirst, Dict.union rangeMap acc )
        )
        ( Nothing, Dict.empty )
        items


replaceCollectionById : String -> Collection -> Collection -> Collection
replaceCollectionById collectionId replacement collection =
    let
        continueSearch updatedChild stack =
            case stack of
                [] ->
                    updatedChild

                frame :: rest ->
                    loopSearch
                        { beforeRev = NestedCollection updatedChild :: frame.beforeRev
                        , collection = frame.collection
                        , rest = frame.rest
                        }
                        rest

        rebuildUp updatedChild stack =
            case stack of
                [] ->
                    updatedChild

                frame :: rest ->
                    let
                        baseCollection =
                            frame.collection
                    in
                    rebuildUp
                        { baseCollection
                            | items =
                                List.reverse (NestedCollection updatedChild :: frame.beforeRev)
                                    ++ frame.rest
                        }
                        rest

        loopSearch state stack =
            if state.collection.id == collectionId then
                rebuildUp replacement stack

            else
                case state.rest of
                    [] ->
                        let
                            baseCollection =
                                state.collection
                        in
                        continueSearch
                            { baseCollection | items = List.reverse state.beforeRev }
                            stack

                    item :: rest ->
                        case item of
                            NestedCollection nested ->
                                loopSearch
                                    { beforeRev = []
                                    , collection = nested
                                    , rest = nested.items
                                    }
                                    ({ beforeRev = state.beforeRev
                                     , collection = state.collection
                                     , rest = rest
                                     }
                                        :: stack
                                    )

                            ManifestItem _ ->
                                loopSearch
                                    { state | beforeRev = item :: state.beforeRev, rest = rest }
                                    stack
    in
    loopSearch
        { beforeRev = [], collection = collection, rest = collection.items }
        []


requestAnnotations : String -> Model -> ( Model, Cmd Msg )
requestAnnotations canvasId model =
    if not model.enableAnnotations || Set.member canvasId model.annotationLoading || Dict.member canvasId model.annotationsByCanvas then
        ( model, Cmd.none )

    else
        let
            sources =
                Dict.get canvasId model.annotationSources
                    |> Maybe.withDefault []

            request url =
                Http.get
                    { url = url
                    , expect = Http.expectJson (ServerRespondedWithAnnotations canvasId) IIIFAnnotation.decodePage
                    }

            inlineAnnotations =
                sources
                    |> List.filterMap
                        (\source ->
                            case source of
                                AnnotationSourceUrl _ ->
                                    Nothing

                                InlineAnnotationPage value ->
                                    Decode.decodeValue IIIFAnnotation.decodePage value |> Result.toMaybe
                        )
                    |> List.concat

            urls =
                sources
                    |> List.filterMap
                        (\source ->
                            case source of
                                AnnotationSourceUrl url ->
                                    Just url

                                InlineAnnotationPage _ ->
                                    Nothing
                        )

            fallback =
                case ( List.isEmpty sources, model.annotationServer, currentManifest model ) of
                    ( True, Just server, Just (IIIFManifest version _) ) ->
                        [ annotationServerUrl server
                            canvasId
                            (if version == IIIF.Version.IIIFV2 then
                                "2"

                             else
                                "3"
                            )
                        ]

                    _ ->
                        []

            nextModel =
                if List.isEmpty inlineAnnotations then
                    model

                else
                    { model | annotationsByCanvas = Dict.insert canvasId inlineAnnotations model.annotationsByCanvas }
        in
        ( { nextModel | annotationLoading = Set.insert canvasId nextModel.annotationLoading }
        , Cmd.batch
            (List.map request (urls ++ fallback)
                ++ [ annotationsUpdated { canvasId = canvasId, annotations = List.map (Annotation.encode (annotationImageServiceForCanvas canvasId model)) inlineAnnotations } ]
            )
        )


resolveInitialPageIndex : Maybe Decode.Value -> List Model.Page -> Int
resolveInitialPageIndex encoded pages =
    let
        fallback =
            0
    in
    case encoded |> Maybe.andThen (Decode.decodeValue initialPageTargetDecoder >> Result.toMaybe) of
        Just (InitialPageIndex index) ->
            if index >= 0 && index < List.length pages then
                index

            else
                fallback

        Just (InitialPageCanvasId canvasId) ->
            findPageIndex (\page -> page.canvasId == canvasId) pages
                |> Maybe.withDefault fallback

        Just (InitialPageLabel label) ->
            findPageIndex (\page -> String.toLower page.label == String.toLower label) pages
                |> Maybe.withDefault fallback

        Nothing ->
            fallback


runAuthEffect : Auth.Effect -> Cmd Msg
runAuthEffect effect =
    case effect of
        Auth.Fetch operationId url bearer withCredentials ->
            authHttpRequested
                (Encode.object
                    [ ( "id", Encode.string operationId )
                    , ( "url", Encode.string url )
                    , ( "bearer", Maybe.map Encode.string bearer |> Maybe.withDefault Encode.null )
                    , ( "withCredentials", Encode.bool withCredentials )
                    ]
                )

        Auth.CancelFetch operationId ->
            authHttpCancelled operationId

        Auth.ReadToken flowId key ->
            authStorageRequested
                (Encode.object
                    [ ( "action", Encode.string "read" )
                    , ( "flowId", Encode.string flowId )
                    , ( "key", Encode.string key )
                    ]
                )

        Auth.WriteToken flowId key accessToken expiresAt ->
            authStorageRequested
                (Encode.object
                    [ ( "action", Encode.string "write" )
                    , ( "flowId", Encode.string flowId )
                    , ( "key", Encode.string key )
                    , ( "accessToken", Encode.string accessToken )
                    , ( "expiresAt", Encode.float expiresAt )
                    ]
                )

        Auth.RemoveToken flowId key ->
            authStorageRequested
                (Encode.object
                    [ ( "action", Encode.string "remove" )
                    , ( "flowId", Encode.string flowId )
                    , ( "key", Encode.string key )
                    ]
                )

        Auth.StartTokenFrame flowId url messageId ->
            authTokenFrameRequested
                (Encode.object
                    [ ( "flowId", Encode.string flowId )
                    , ( "url", Encode.string url )
                    , ( "messageId", Encode.string messageId )
                    ]
                )

        Auth.CancelTokenFrame flowId ->
            authTokenFrameCancelled flowId

        Auth.InvalidateSources sourceIds ->
            authSourcesInvalidated sourceIds

        Auth.Complete resolution ->
            tileSourceResolutionSucceeded
                (Encode.object
                    [ ( "requestId", Encode.string resolution.requestId )
                    , ( "url", Encode.string resolution.url )
                    , ( "isStatic", Encode.bool resolution.isStatic )
                    , ( "credentialed", Encode.bool resolution.credentialed )
                    , ( "infoJson", Maybe.withDefault Encode.null resolution.infoJson )
                    ]
                )

        Auth.Fail requestId message ->
            tileSourceResolutionFailed { requestId = requestId, message = message }


runAuthEffects : List Auth.Effect -> Cmd Msg
runAuthEffects effects =
    effects
        |> List.map runAuthEffect
        |> Cmd.batch


scrollThumbsToIndex : Bool -> Int -> Cmd Msg
scrollThumbsToIndex showThumbs index =
    if showThumbs then
        let
            delayedTask =
                Process.sleep 0
                    |> Task.andThen
                        (\_ ->
                            let
                                thumbId =
                                    "thumb-" ++ String.fromInt index
                            in
                            Task.map3
                                (\thumb container viewport ->
                                    max 0 (thumb.element.y - container.element.y + viewport.viewport.y)
                                        |> Dom.setViewportOf "thumbs" 0
                                )
                                (Dom.getElement thumbId)
                                (Dom.getElement "thumbs")
                                (Dom.getViewportOf "thumbs")
                                |> Task.andThen identity
                        )
        in
        Task.attempt (\_ -> ClientNotifiedScrollThumbs) delayedTask

    else
        Cmd.none


sendPageViewPreview : Model -> Cmd Msg
sendPageViewPreview model =
    if model.pageViewOpen then
        model.selectedIndex
            |> Maybe.andThen (\index -> getPageAt index model.pages)
            |> Maybe.andThen
                (\page ->
                    List.drop model.pageViewImageIndex page.images
                        |> List.head
                        |> Maybe.map
                            (\image ->
                                filterPreviewUpdated
                                    (Just
                                        { aspect = page.aspect
                                        , filters = model.filters
                                        , isStatic = image.isStatic
                                        , sourceId = image.sourceId
                                        , tileSource = image.tileSource
                                        }
                                    )
                            )
                )
            |> Maybe.withDefault Cmd.none

    else
        Cmd.none


sidebarPanelForManifest : IIIFManifest -> SidebarState -> SidebarState
sidebarPanelForManifest manifest requested =
    case requested of
        SidebarMetadata ->
            let
                hasMetadata =
                    not (List.isEmpty (toMetadata manifest))

                hasHomepage =
                    toHomepage manifest
                        |> Maybe.map (List.isEmpty >> not)
                        |> Maybe.withDefault False
            in
            if hasMetadata || hasHomepage then
                SidebarMetadata

            else
                SidebarThumbnails

        SidebarContents ->
            if
                toRanges manifest
                    |> Maybe.map (List.isEmpty >> not)
                    |> Maybe.withDefault False
            then
                SidebarContents

            else
                SidebarThumbnails

        _ ->
            SidebarThumbnails


sidebarPanelFromString : String -> SidebarState
sidebarPanelFromString value =
    case value of
        "contents" ->
            SidebarContents

        "metadata" ->
            SidebarMetadata

        _ ->
            SidebarThumbnails


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ resolveTileSourceRequested (\request -> AuthEvent (Auth.Resolve request.requestId request.sourceId))
        , resourceRequested (\request -> ClientRequestedResource request.requestId request.url)
        , layoutModeRequested ClientRequestedLayoutMode
        , resolveTileSourceCancelled (Auth.Cancel >> AuthEvent)
        , authHttpResponded (\response -> AuthEvent (Auth.HttpSucceeded response.id response.status response.body))
        , authHttpFailed (\response -> AuthEvent (Auth.HttpFailed response.id response.message))
        , authStorageResponded (\response -> AuthEvent (Auth.StorageRead response.flowId response.now response.value))
        , authTokenMessage (\response -> AuthEvent (Auth.TokenMessage response.flowId response.now response.value))
        , authTokenFailed (\response -> AuthEvent (Auth.TokenFailed response.flowId response.message))
        , authPopupChanged popupEvent
        , authLogoutChanged logoutEvent
        , authDestroyed (\_ -> AuthEvent Auth.Destroyed)
        , pageIndexChanged ClientNotifiedPageChanged
        , pageIndexChangedInstant ClientNotifiedPageChangedInstant
        , fullscreenChanged ClientNotifiedFullscreenChanged
        , zoomChanged UserChangedZoomLevel
        , viewerLoadingChanged ViewerLoadingChanged
        , viewerPageLoaded ViewerLoadedPage
        , Browser.Events.onResize (\width _ -> ViewportChanged width)
        , case model.sidebarDrag of
            Just _ ->
                Sub.batch
                    [ Browser.Events.onMouseMove
                        (Decode.field "clientX" Decode.int |> Decode.map UserDraggedSidebarResize)
                    , Browser.Events.onMouseUp (Decode.succeed UserEndedSidebarResize)
                    ]

            Nothing ->
                Sub.none
        , case model.collectionSidebarDrag of
            Just _ ->
                Sub.batch
                    [ Browser.Events.onMouseMove
                        (Decode.field "clientX" Decode.int |> Decode.map UserDraggedCollectionSidebarResize)
                    , Browser.Events.onMouseUp (Decode.succeed UserEndedCollectionSidebarResize)
                    ]

            Nothing ->
                Sub.none
        ]


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        AuthEvent event ->
            let
                ( nextAuth, effects ) =
                    Auth.update event model.auth
            in
            ( { model | auth = nextAuth }, runAuthEffects effects )

        ClientRequestedLayoutMode requestedMode ->
            let
                ( nextViewMode, nextShift ) =
                    case requestedMode of
                        "spread" ->
                            ( TwoUp, False )

                        "spread-shift" ->
                            ( TwoUp, True )

                        _ ->
                            ( OneUp, False )
            in
            ( { model | viewMode = nextViewMode, shiftByOne = nextShift }
            , layoutModeUpdated (layoutModeToString nextViewMode nextShift)
            )

        ClientRequestedResource requestId url ->
            ( { model
                | initialResourceSuperseded = True
                , pendingPublicResource = Just requestId
                , isViewerLoading = True
              }
            , IIIF.requestResource (ServerRespondedWithRequestedResource requestId url) model.acceptHeaders url
            )

        ClientNotifiedFullscreenChanged enabled ->
            ( { model | fullscreen = enabled }, Cmd.none )

        ClientNotifiedPageChanged index ->
            handlePageChanged False index model

        ClientNotifiedPageChangedInstant index ->
            handlePageChanged True index model

        ClientNotifiedScrollThumbs ->
            ( { model | thumbsInstantScroll = False }, Cmd.none )

        ServerRespondedWithCollectionItem collectionId result ->
            case model.resourceResponse of
                ResourceLoadedCollection collectionState ->
                    let
                        nextLoadingIds =
                            Set.remove collectionId collectionState.loadingCollectionIds
                    in
                    case result of
                        Ok resource ->
                            case resource of
                                ResourceCollection (IIIFCollection _ fetchedCollection) ->
                                    let
                                        (IIIFCollection rootVersion rootCollection) =
                                            collectionState.collection

                                        nextCollection =
                                            replaceCollectionById collectionId fetchedCollection rootCollection

                                        nextState =
                                            { collectionState
                                                | collection = IIIFCollection rootVersion nextCollection
                                                , loadedCollectionIds =
                                                    Set.insert collectionId collectionState.loadedCollectionIds
                                                , loadingCollectionIds = nextLoadingIds
                                            }
                                    in
                                    ( { model | resourceResponse = ResourceLoadedCollection nextState }, Cmd.none )

                                _ ->
                                    ( { model
                                        | resourceResponse =
                                            ResourceLoadedCollection
                                                { collectionState | loadingCollectionIds = nextLoadingIds }
                                      }
                                    , Cmd.none
                                    )

                        Err _ ->
                            ( { model
                                | resourceResponse =
                                    ResourceLoadedCollection
                                        { collectionState | loadingCollectionIds = nextLoadingIds }
                              }
                            , Cmd.none
                            )

                _ ->
                    ( model, Cmd.none )

        ServerRespondedWithManifestFromCollection manifestId result ->
            case model.resourceResponse of
                ResourceLoadedCollection collectionState ->
                    if collectionState.selectedManifestId /= Just manifestId then
                        ( model, Cmd.none )

                    else
                        case result of
                            Ok manifest ->
                                handleManifestLoaded ("collection-" ++ manifestId) Nothing model manifest

                            Err err ->
                                ( { model
                                    | isViewerLoading = False
                                    , response = Failed (httpErrorToString err)
                                  }
                                , Cmd.none
                                )

                _ ->
                    ( model, Cmd.none )

        ServerRespondedWithResource result ->
            if model.initialResourceSuperseded then
                ( model, Cmd.none )

            else
                case result of
                    Ok resource ->
                        case resource of
                            ResourceManifest manifest ->
                                let
                                    ( nextModel, cmd ) =
                                        handleManifestLoaded "initial" (Just model.initialPage) model manifest
                                in
                                ( { nextModel
                                    | collectionSidebarVisible = False
                                    , resourceResponse = ResourceLoadedManifest manifest
                                  }
                                , Cmd.batch
                                    [ cmd
                                    , resourceLoadSucceeded
                                        { requestId = "initial"
                                        , url = model.manifestUrl
                                        , hasPages = not (List.isEmpty nextModel.pages)
                                        , pageIndex = Maybe.withDefault 0 nextModel.selectedIndex
                                        }
                                    ]
                                )

                            ResourceCollection (IIIFCollection version collection) ->
                                ( { model
                                    | auth = Auth.init
                                    , collectionSidebarVisible = True
                                    , isViewerLoading = False
                                    , pages = []
                                    , selectedIndex = Nothing
                                    , resourceResponse =
                                        ResourceLoadedCollection
                                            { collection = IIIFCollection version collection
                                            , expandedIds = Set.empty
                                            , loadedCollectionIds = Set.empty
                                            , loadingCollectionIds = Set.empty
                                            , selectedManifestId = Nothing
                                            }
                                    , response = NotRequested
                                  }
                                , Cmd.batch
                                    [ clearViewer "initial"
                                    , resourceLoadSucceeded { requestId = "initial", url = model.manifestUrl, hasPages = False, pageIndex = 0 }
                                    ]
                                )

                            _ ->
                                ( { model | isViewerLoading = False }
                                , resourceLoadFailed
                                    { requestId = "initial"
                                    , url = model.manifestUrl
                                    , message = "URL did not return a supported IIIF resource."
                                    }
                                )

                    Err err ->
                        ( { model
                            | isViewerLoading = False
                            , resourceResponse = ResourceFailed (httpErrorToString err)
                          }
                        , resourceLoadFailed
                            { requestId = "initial"
                            , url = model.manifestUrl
                            , message = httpErrorToString err
                            }
                        )

        ServerRespondedWithRequestedResource requestId url result ->
            if model.pendingPublicResource /= Just requestId then
                ( model, Cmd.none )

            else
                case result of
                    Ok resource ->
                        case resource of
                            ResourceManifest manifest ->
                                let
                                    ( nextModel, cmd ) =
                                        handleManifestLoaded requestId Nothing model manifest
                                in
                                ( { nextModel
                                    | collectionSidebarVisible = False
                                    , manifestUrl = url
                                    , pendingPublicResource = Nothing
                                    , resourceResponse = ResourceLoadedManifest manifest
                                  }
                                , Cmd.batch
                                    [ cmd
                                    , resourceLoadSucceeded
                                        { requestId = requestId
                                        , url = url
                                        , hasPages = not (List.isEmpty nextModel.pages)
                                        , pageIndex = 0
                                        }
                                    ]
                                )

                            ResourceCollection (IIIFCollection version collection) ->
                                ( { model
                                    | auth = Auth.init
                                    , collectionSidebarVisible = True
                                    , isViewerLoading = False
                                    , manifestUrl = url
                                    , pages = []
                                    , pendingPublicResource = Nothing
                                    , selectedIndex = Nothing
                                    , resourceResponse =
                                        ResourceLoadedCollection
                                            { collection = IIIFCollection version collection
                                            , expandedIds = Set.empty
                                            , loadedCollectionIds = Set.empty
                                            , loadingCollectionIds = Set.empty
                                            , selectedManifestId = Nothing
                                            }
                                    , response = NotRequested
                                  }
                                , Cmd.batch
                                    [ clearViewer requestId
                                    , resourceLoadSucceeded { requestId = requestId, url = url, hasPages = False, pageIndex = 0 }
                                    ]
                                )

                            _ ->
                                ( { model | pendingPublicResource = Nothing, isViewerLoading = False }
                                , resourceLoadFailed
                                    { requestId = requestId
                                    , url = url
                                    , message = "URL did not return a supported IIIF resource."
                                    }
                                )

                    Err err ->
                        ( { model | pendingPublicResource = Nothing, isViewerLoading = False }
                        , resourceLoadFailed
                            { requestId = requestId
                            , url = url
                            , message = httpErrorToString err
                            }
                        )

        UserAppliedFilterJson ->
            case decodeFilterJson model.filtersJsonInput of
                Ok filters ->
                    let
                        json =
                            encodeActiveFilters filters

                        nextModel =
                            { model
                                | filters = filters
                                , filtersJsonError = Nothing
                                , filtersJsonInput = json
                            }
                    in
                    ( nextModel, sendPageViewPreview nextModel )

                Err err ->
                    ( { model | filtersJsonError = Just err }, Cmd.none )

        UserChangedZoomLevel zoom ->
            let
                nextInitialZoom =
                    case model.initialZoom of
                        Just initialZoom ->
                            Just initialZoom

                        Nothing ->
                            Just zoom
            in
            ( { model
                | currentZoom = Just zoom
                , initialZoom = nextInitialZoom
              }
            , Cmd.none
            )

        UserClickedCloseManifestInfo ->
            ( { model | manifestInfoOpen = False }, Cmd.none )

        UserClickedClosePageView ->
            let
                nextModel =
                    { model
                        | filters = resetFilters
                        , pageViewFullscreen = False
                        , pageViewImageIndex = 0
                        , pageViewOpen = False
                    }
            in
            ( nextModel, filterPreviewUpdated Nothing )

        UserClickedCollectionItem collectionId ->
            case model.resourceResponse of
                ResourceLoadedCollection collectionState ->
                    let
                        (IIIFCollection _ rootCollection) =
                            collectionState.collection

                        isItemsEmpty =
                            findCollectionById collectionId rootCollection
                                |> Maybe.map (.items >> List.isEmpty)
                                |> Maybe.withDefault True

                        shouldRequest =
                            isItemsEmpty
                                && not (Set.member collectionId collectionState.loadedCollectionIds)
                                && not (Set.member collectionId collectionState.loadingCollectionIds)

                        isExpanded =
                            Set.member collectionId collectionState.expandedIds

                        nextExpandedIds =
                            if isExpanded then
                                Set.remove collectionId collectionState.expandedIds

                            else
                                Set.insert collectionId collectionState.expandedIds

                        nextLoadingIds =
                            if shouldRequest then
                                Set.insert collectionId collectionState.loadingCollectionIds

                            else
                                collectionState.loadingCollectionIds

                        nextState =
                            { collectionState
                                | expandedIds = nextExpandedIds
                                , loadingCollectionIds = nextLoadingIds
                            }
                    in
                    ( { model
                        | resourceResponse =
                            ResourceLoadedCollection
                                nextState
                      }
                    , if shouldRequest then
                        IIIF.requestResource
                            (ServerRespondedWithCollectionItem collectionId)
                            model.acceptHeaders
                            collectionId

                      else
                        Cmd.none
                    )

                _ ->
                    ( model, Cmd.none )

        UserClickedManifestItem manifestId manifestUrl ->
            case model.resourceResponse of
                ResourceLoadedCollection collectionState ->
                    ( { model
                        | isViewerLoading = True
                        , response = Loading
                        , resourceResponse =
                            ResourceLoadedCollection
                                { collectionState | selectedManifestId = Just manifestId }
                      }
                    , IIIF.requestManifest (ServerRespondedWithManifestFromCollection manifestId) model.acceptHeaders manifestUrl
                    )

                _ ->
                    ( model, Cmd.none )

        UserClickedOpenManifestInfo ->
            ( { model | manifestInfoOpen = True }, Cmd.none )

        UserClickedOpenPageView ->
            let
                nextModel =
                    { model
                        | pageViewImageIndex = 0
                        , pageViewOpen = True
                        , pageViewSidebarVisible = True
                        , sidebarState = visibleSidebarState model
                    }
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserClickedPageViewImageChoice index ->
            let
                nextModel =
                    { model | pageViewImageIndex = index }
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserClickedPageViewNext ->
            handlePageViewStep 1 model

        UserClickedPageViewPrev ->
            handlePageViewStep -1 model

        UserClickedRange maybeIndex ->
            let
                nextModel =
                    { model
                        | pendingThumbScroll = maybeIndex
                        , selectedIndex =
                            case maybeIndex of
                                Just index ->
                                    Just index

                                Nothing ->
                                    model.selectedIndex
                        , sidebarState = visibleSidebarState model
                        , thumbsInstantScroll = True
                    }

                scrollCmd =
                    case maybeIndex of
                        Just index ->
                            scrollToIndex index

                        Nothing ->
                            Cmd.none
            in
            ( nextModel
            , Cmd.batch
                [ scrollCmd
                , sendPageViewPreview nextModel
                ]
            )

        UserClickedSaveFilteredImage ->
            ( model, saveFilteredImage () )

        UserClickedThumbnail index ->
            let
                nextModel =
                    { model
                        | pageViewImageIndex = 0
                        , selectedIndex = Just index
                        , sidebarState = visibleSidebarState model
                        , thumbsInstantScroll = False
                    }
            in
            ( nextModel
            , Cmd.batch
                [ scrollToIndex index
                , scrollThumbsToIndex (nextModel.sidebarState == SidebarThumbnails) index
                , sendPageViewPreview nextModel
                ]
            )

        UserClickedZoomIn ->
            updateZoom model zoomInFactor

        UserClickedZoomOut ->
            updateZoom model zoomOutFactor

        UserCopiedFilterJson ->
            let
                json =
                    encodeActiveFilters model.filters
            in
            ( { model | filtersJsonError = Nothing, filtersJsonInput = json }
            , copyToClipboard json
            )

        UserDraggedCollectionSidebarResize clientX ->
            case model.collectionSidebarDrag of
                Just drag ->
                    let
                        nextWidth =
                            (drag.startWidth + (clientX - drag.startX))
                                |> clamp 240 480
                    in
                    ( { model | collectionSidebarWidth = nextWidth }, Cmd.none )

                Nothing ->
                    ( model, Cmd.none )

        UserDraggedSidebarResize clientX ->
            case model.sidebarDrag of
                Just drag ->
                    let
                        delta =
                            drag.startX - clientX

                        nextWidth =
                            clamp 220 520 (drag.startWidth + delta)
                    in
                    ( { model | sidebarWidth = nextWidth }, Cmd.none )

                Nothing ->
                    ( model, Cmd.none )

        UserEndedCollectionSidebarResize ->
            ( { model | collectionSidebarDrag = Nothing }, Cmd.none )

        UserEndedSidebarResize ->
            ( { model | sidebarDrag = Nothing }, Cmd.none )

        UserResetAllFilters ->
            let
                nextModel =
                    { model
                        | filters = resetFilters
                        , filtersJsonError = Nothing
                    }
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserResetAltColourAdjust ->
            let
                nextModel =
                    updateFilters resetAltColourAdjust model
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserSelectedContentsIndex ->
            ( { model | contentsView = ContentsIndex }, Cmd.none )

        UserSelectedContentsPages ->
            ( { model | contentsView = ContentsPages }, Cmd.none )

        UserStartedCollectionSidebarResize clientX ->
            ( { model | collectionSidebarDrag = Just { startWidth = model.collectionSidebarWidth, startX = clientX } }
            , Cmd.none
            )

        UserStartedSidebarResize clientX ->
            ( { model | sidebarDrag = Just { startWidth = model.sidebarWidth, startX = clientX } }
            , Cmd.none
            )

        UserToggledContents ->
            ( { model
                | sidebarPanel = SidebarContents
                , sidebarState = SidebarContents
              }
            , Cmd.none
            )

        UserToggledCollectionSidebar ->
            case model.resourceResponse of
                ResourceLoadedCollection _ ->
                    ( { model | collectionSidebarVisible = not model.collectionSidebarVisible }, Cmd.none )

                _ ->
                    ( model, Cmd.none )

        UserToggledFilter toggle enabled ->
            let
                nextModel =
                    updateFilters (applyFilterToggle toggle enabled) model
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserToggledFilterGroup groupId ->
            let
                nextExpanded =
                    if Set.member groupId model.filterGroupExpanded then
                        Set.remove groupId model.filterGroupExpanded

                    else
                        Set.insert groupId model.filterGroupExpanded
            in
            ( { model | filterGroupExpanded = nextExpanded }, Cmd.none )

        UserToggledFullscreen ->
            let
                nextFullscreen =
                    not model.fullscreen
            in
            ( { model | fullscreen = nextFullscreen }
            , setFullscreen nextFullscreen
            )

        UserToggledMetadata ->
            ( { model | sidebarPanel = SidebarMetadata, sidebarState = SidebarMetadata }, Cmd.none )

        UserToggledPageViewFullscreen ->
            ( { model | pageViewFullscreen = not model.pageViewFullscreen }, Cmd.none )

        UserToggledPageViewSidebar ->
            ( { model | pageViewSidebarVisible = not model.pageViewSidebarVisible }, Cmd.none )

        UserToggledRangeMetadata rangeId ->
            ( { model
                | selectedRangeId =
                    if model.selectedRangeId == Just rangeId then
                        Nothing

                    else
                        Just rangeId
              }
            , Cmd.none
            )

        UserToggledShiftByOne ->
            case model.viewMode of
                OneUp ->
                    ( model, Cmd.none )

                TwoUp ->
                    let
                        nextShift =
                            not model.shiftByOne
                    in
                    ( { model | shiftByOne = nextShift }
                    , layoutModeUpdated (layoutModeToString TwoUp nextShift)
                    )

        UserToggledSidebar ->
            if model.isMobile then
                if model.mobileSidebarOpen then
                    ( { model
                        | mobileSidebarOpen = False
                        , sidebarState = SidebarHidden
                      }
                    , Cmd.none
                    )

                else
                    ( { model
                        | mobileSidebarOpen = True
                        , sidebarState = model.sidebarPanel
                      }
                    , Cmd.none
                    )

            else if model.sidebarState == SidebarHidden then
                ( { model | sidebarState = model.sidebarPanel }, Cmd.none )

            else
                ( { model | sidebarState = SidebarHidden }, Cmd.none )

        UserToggledThumbnails ->
            let
                nextModel =
                    { model | sidebarPanel = SidebarThumbnails, sidebarState = SidebarThumbnails }

                thumbCmd =
                    case ( model.pendingThumbScroll, model.selectedIndex ) of
                        ( Just index, _ ) ->
                            scrollThumbsToIndex True index

                        ( Nothing, Just index ) ->
                            scrollThumbsToIndex True index

                        _ ->
                            Cmd.none

                nextInstant =
                    case model.pendingThumbScroll of
                        Just _ ->
                            True

                        Nothing ->
                            False
            in
            ( { nextModel
                | pendingThumbScroll = Nothing
                , thumbsInstantScroll = nextInstant
              }
            , thumbCmd
            )

        UserToggledTwoUp ->
            let
                nextMode =
                    case model.viewMode of
                        OneUp ->
                            TwoUp

                        TwoUp ->
                            OneUp
            in
            ( { model | viewMode = nextMode }
            , layoutModeUpdated (layoutModeToString nextMode model.shiftByOne)
            )

        UserUpdatedFilterFloat floatFilter raw ->
            let
                nextModel =
                    updateFilters (applyFloatFilter floatFilter raw) model
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserUpdatedFilterInt intFilter raw ->
            let
                nextModel =
                    updateFilters (applyIntFilter intFilter raw) model
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserUpdatedFilterJsonInput raw ->
            ( { model | filtersJsonError = Nothing, filtersJsonInput = raw }, Cmd.none )

        UserUpdatedFilterString stringFilter raw ->
            let
                nextModel =
                    updateFilters (applyStringFilter stringFilter raw) model
            in
            ( nextModel, sendPageViewPreview nextModel )

        ViewerLoadingChanged isLoading ->
            ( { model | isViewerLoading = isLoading }, Cmd.none )

        ViewportChanged width ->
            let
                nextIsMobile =
                    width <= mobileWidthBreakpoint

                nextModel =
                    if nextIsMobile then
                        { model
                            | isMobile = True
                            , mobileSidebarOpen = False
                            , sidebarState = SidebarHidden
                        }

                    else
                        { model
                            | isMobile = False
                            , mobileSidebarOpen = False
                        }
            in
            ( nextModel, Cmd.none )

        ViewerLoadedPage index ->
            case getPageAt index model.pages of
                Just page ->
                    requestAnnotations page.canvasId model

                Nothing ->
                    ( model, Cmd.none )

        ServerRespondedWithAnnotations canvasId result ->
            let
                nextModel =
                    { model | annotationLoading = Set.remove canvasId model.annotationLoading }
            in
            case result of
                Ok annotations ->
                    let
                        merged =
                            Dict.get canvasId nextModel.annotationsByCanvas
                                |> Maybe.withDefault []
                                |> (\existing -> annotations ++ existing)
                    in
                    ( { nextModel | annotationsByCanvas = Dict.insert canvasId merged nextModel.annotationsByCanvas }
                    , annotationsUpdated { canvasId = canvasId, annotations = List.map (Annotation.encode (annotationImageServiceForCanvas canvasId nextModel)) merged }
                    )

                Err _ ->
                    ( nextModel, Cmd.none )

        UserToggledAnnotations ->
            ( { model | annotationsVisible = not model.annotationsVisible }
            , annotationsVisibilityUpdated (not model.annotationsVisible)
            )


updateZoom : Model -> Float -> ( Model, Cmd Msg )
updateZoom model factor =
    ( model, zoomBy factor )


viewingDirectionToString : ViewingDirection -> String
viewingDirectionToString direction =
    case direction of
        LeftToRight ->
            "ltr"

        RightToLeft ->
            "rtl"

        TopToBottom ->
            "ltr"

        BottomToTop ->
            "ltr"


visibleSidebarState : Model -> SidebarState
visibleSidebarState model =
    case model.sidebarState of
        SidebarHidden ->
            model.sidebarPanel

        state ->
            state


zoomInFactor : Float
zoomInFactor =
    1.6


zoomOutFactor : Float
zoomOutFactor =
    1 / zoomInFactor
