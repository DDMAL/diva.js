port module Main exposing (Flags, main)

import Browser
import Browser.Dom as Dom
import Browser.Events
import Dict exposing (Dict)
import Filters exposing (FilterFloatValue(..), FilterIntValue(..), FilterStringValue(..), FilterToggle(..), Filters, applyFilterToggle, applyFloatFilter, applyIntFilter, applyStringFilter, decodeFilterJson, encodeActiveFilters, resetAltColourAdjust, resetFilters, updateFilters)
import Html
import Http
import IIIF
import IIIF.Language exposing (Language(..))
import IIIF.Presentation exposing (Collection, CollectionItem(..), IIIFCollection(..), IIIFManifest, IIIFResource(..), Range, RangeItem(..), ViewingDirection(..), isPagedLayout, manifestViewingLayout, toCanvases, toRanges, toViewingDirection)
import Json.Decode as Decode
import Model exposing (ContentsView(..), Model, ResourceResponse(..), Response(..), SidebarState(..), ViewMode(..), getPageAt, manifestToPages, primaryImage)
import Msg exposing (Msg(..))
import Process
import Set
import Task
import View


type alias Flags =
    { rootElementId : String
    , objectData : String
    , acceptHeaders : List String
    , showSidebar : Bool
    , showTitle : Bool
    , userLanguage : String
    }


port tileSourcesUpdated : List String -> Cmd msg


port pageAspectsUpdated : List Float -> Cmd msg


port zoomLevelUpdated : Float -> Cmd msg


port zoomBy : Float -> Cmd msg


port scrollToIndex : Int -> Cmd msg


port pageIndexChanged : (Int -> msg) -> Sub msg


port pageIndexChangedInstant : (Int -> msg) -> Sub msg


port filterPreviewUpdated :
    { tileSource : String
    , aspect : Float
    , filters : Filters
    }
    -> Cmd msg


port setFullscreen : Bool -> Cmd msg


port fullscreenChanged : (Bool -> msg) -> Sub msg


port layoutModeUpdated : String -> Cmd msg


port layoutConfigUpdated : { mode : String, direction : String } -> Cmd msg


port zoomChanged : (Float -> msg) -> Sub msg


port viewerLoadingChanged : (Bool -> msg) -> Sub msg


port saveFilteredImage : () -> Cmd msg


port copyToClipboard : String -> Cmd msg


main : Program Flags Model Msg
main =
    Browser.element
        { init = init
        , subscriptions = subscriptions
        , update = update
        , view = View.view
        }


init : Flags -> ( Model, Cmd Msg )
init flags =
    let
        manifestUrl =
            flags.objectData

        sidebarState =
            if flags.showSidebar then
                SidebarThumbnails

            else
                SidebarHidden

        userLanguage =
            LanguageCode flags.userLanguage
    in
    ( { acceptHeaders = flags.acceptHeaders
      , canvasIndexMap = Dict.empty
      , collectionSidebarDrag = Nothing
      , collectionSidebarVisible = True
      , collectionSidebarWidth = 400
      , contentsView = ContentsIndex
      , filterGroupExpanded = Set.empty
      , filters = resetFilters
      , filtersJsonError = Nothing
      , filtersJsonInput = ""
      , fullscreen = False
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
      , rangeIndexMap = Dict.empty
      , resourceResponse = ResourceNotRequested
      , response = NotRequested
      , rootElementId = flags.rootElementId
      , selectedIndex = Nothing
      , selectedRangeId = Nothing
      , shiftByOne = False
      , showTitle = flags.showTitle
      , sidebarDrag = Nothing
      , sidebarState = sidebarState
      , sidebarWidth = 320
      , thumbsInstantScroll = False
      , tileSources = []
      , viewMode = OneUp
      , zoom = 1
      , detectedLanguage = userLanguage
      }
    , Cmd.batch
        [ IIIF.requestResource ServerRespondedWithResource flags.acceptHeaders manifestUrl
        , Task.perform (\_ -> SetResponseLoading) (Task.succeed ())
        , Task.perform (\viewport -> ViewportChanged (round viewport.viewport.width) (round viewport.viewport.height)) Dom.getViewport
        ]
    )


zoomInFactor : Float
zoomInFactor =
    1.6


zoomOutFactor : Float
zoomOutFactor =
    1 / zoomInFactor


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ClientNotifiedFullscreenChanged enabled ->
            ( { model | fullscreen = enabled }, Cmd.none )

        ServerRespondedWithManifest result ->
            case result of
                Ok manifest ->
                    handleManifestLoaded model manifest

                Err err ->
                    ( { model
                        | isViewerLoading = False
                        , response = Failed (httpErrorToString err)
                      }
                    , Cmd.none
                    )

        ServerRespondedWithResource result ->
            case result of
                Ok resource ->
                    case resource of
                        ResourceManifest manifest ->
                            let
                                ( nextModel, cmd ) =
                                    handleManifestLoaded model manifest
                            in
                            ( { nextModel
                                | collectionSidebarVisible = False
                                , resourceResponse = ResourceLoadedManifest manifest
                              }
                            , cmd
                            )

                        ResourceCollection (IIIFCollection version collection) ->
                            ( { model
                                | collectionSidebarVisible = True
                                , isViewerLoading = False
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
                            , Cmd.none
                            )

                        _ ->
                            ( model, Cmd.none )

                Err err ->
                    ( { model
                        | isViewerLoading = False
                        , resourceResponse = ResourceFailed (httpErrorToString err)
                      }
                    , Cmd.none
                    )

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

        UserClickedManifestItem manifestId manifestUrl ->
            case model.resourceResponse of
                ResourceLoadedCollection collectionState ->
                    ( { model
                        | isViewerLoading = True
                        , resourceResponse =
                            ResourceLoadedCollection
                                { collectionState | selectedManifestId = Just manifestId }
                        , response = Loading
                      }
                    , IIIF.requestManifest ServerRespondedWithManifestFromCollection model.acceptHeaders manifestUrl
                    )

                _ ->
                    ( model, Cmd.none )

        ServerRespondedWithManifestFromCollection result ->
            case result of
                Ok manifest ->
                    handleManifestLoaded model manifest

                Err err ->
                    ( { model
                        | isViewerLoading = False
                        , response = Failed (httpErrorToString err)
                      }
                    , Cmd.none
                    )

        UserToggledCollectionSidebar ->
            ( { model | collectionSidebarVisible = not model.collectionSidebarVisible }, Cmd.none )

        UserStartedCollectionSidebarResize clientX ->
            ( { model | collectionSidebarDrag = Just { startWidth = model.collectionSidebarWidth, startX = clientX } }
            , Cmd.none
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

        UserEndedCollectionSidebarResize ->
            ( { model | collectionSidebarDrag = Nothing }, Cmd.none )

        ClientNotifiedPageChanged index ->
            let
                nextModel =
                    { model | pageViewImageIndex = 0, selectedIndex = Just index, thumbsInstantScroll = False }
            in
            ( nextModel
            , Cmd.batch
                [ scrollThumbsToIndex (nextModel.sidebarState == SidebarThumbnails) index
                , sendPageViewPreview nextModel
                ]
            )

        ClientNotifiedPageChangedInstant index ->
            let
                nextModel =
                    { model | pageViewImageIndex = 0, selectedIndex = Just index, thumbsInstantScroll = True }
            in
            ( nextModel
            , Cmd.batch
                [ scrollThumbsToIndex (nextModel.sidebarState == SidebarThumbnails) index
                , sendPageViewPreview nextModel
                ]
            )

        ClientNotifiedScrollThumbs _ ->
            ( { model | thumbsInstantScroll = False }, Cmd.none )

        SetResponseLoading ->
            ( { model | resourceResponse = ResourceLoading, response = Loading }, Cmd.none )

        UserClickedThumbnail index ->
            let
                nextModel =
                    { model
                        | pageViewImageIndex = 0
                        , selectedIndex = Just index
                        , sidebarState = ensureSidebarVisible model.sidebarState
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

        UserToggledFilter toggle enabled ->
            let
                nextModel =
                    updateFilters (applyFilterToggle toggle enabled) model
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserToggledContents ->
            ( { model
                | sidebarState = SidebarContents
              }
            , Cmd.none
            )

        UserClickedOpenPageView ->
            let
                nextModel =
                    { model
                        | pageViewImageIndex = 0
                        , pageViewOpen = True
                        , pageViewSidebarVisible = True
                        , sidebarState = ensureSidebarVisible model.sidebarState
                    }
            in
            ( nextModel, sendPageViewPreview nextModel )

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
            ( nextModel, Cmd.none )

        UserClickedSaveFilteredImage ->
            ( model, saveFilteredImage () )

        UserToggledPageViewFullscreen ->
            ( { model | pageViewFullscreen = not model.pageViewFullscreen }, Cmd.none )

        UserToggledPageViewSidebar ->
            ( { model | pageViewSidebarVisible = not model.pageViewSidebarVisible }, Cmd.none )

        UserClickedOpenManifestInfo ->
            ( { model | manifestInfoOpen = True }, Cmd.none )

        UserClickedCloseManifestInfo ->
            ( { model | manifestInfoOpen = False }, Cmd.none )

        UserToggledMobileSidebar ->
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
                    , sidebarState = ensureSidebarVisible model.sidebarState
                  }
                , Cmd.none
                )

        UserClosedMobileSidebar ->
            ( { model
                | mobileSidebarOpen = False
                , sidebarState = SidebarHidden
              }
            , Cmd.none
            )

        UserClickedPageViewPrev ->
            case model.selectedIndex of
                Just index ->
                    if index > 0 then
                        let
                            nextIndex =
                                index - 1

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

        UserClickedPageViewNext ->
            case model.selectedIndex of
                Just index ->
                    let
                        lastIndex =
                            List.length model.pages - 1
                    in
                    if index < lastIndex then
                        let
                            nextIndex =
                                index + 1

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

        UserResetAltColourAdjust ->
            let
                nextModel =
                    updateFilters resetAltColourAdjust model
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserToggledFullscreen ->
            let
                nextFullscreen =
                    not model.fullscreen
            in
            ( { model | fullscreen = nextFullscreen }
            , setFullscreen nextFullscreen
            )

        UserClickedRange rangeId maybeIndex ->
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
                        , selectedRangeId = Just rangeId
                        , sidebarState = ensureSidebarVisible model.sidebarState
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

        UserToggledMetadata ->
            ( { model | sidebarState = SidebarMetadata }, Cmd.none )

        UserSelectedContentsIndex ->
            ( { model | contentsView = ContentsIndex }, Cmd.none )

        UserSelectedContentsPages ->
            ( { model | contentsView = ContentsPages }, Cmd.none )

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
                        , sidebarState = ensureSidebarVisible model.sidebarState
                      }
                    , Cmd.none
                    )

            else if model.sidebarState == SidebarHidden then
                ( { model | sidebarState = SidebarThumbnails }, Cmd.none )

            else
                ( { model | sidebarState = SidebarHidden }, Cmd.none )

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

        UserToggledThumbnails ->
            let
                nextModel =
                    { model | sidebarState = SidebarThumbnails }

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

        UserUpdatedFilterInt intFilter raw ->
            let
                nextModel =
                    updateFilters (applyIntFilter intFilter raw) model
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserUpdatedFilterFloat floatFilter raw ->
            let
                nextModel =
                    updateFilters (applyFloatFilter floatFilter raw) model
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserUpdatedFilterString stringFilter raw ->
            let
                nextModel =
                    updateFilters (applyStringFilter stringFilter raw) model
            in
            ( nextModel, sendPageViewPreview nextModel )

        UserUpdatedFilterJsonInput raw ->
            ( { model | filtersJsonError = Nothing, filtersJsonInput = raw }, Cmd.none )

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

        UserCopiedFilterJson ->
            let
                json =
                    encodeActiveFilters model.filters
            in
            ( { model | filtersJsonError = Nothing, filtersJsonInput = json }
            , copyToClipboard json
            )

        ViewerLoadingChanged isLoading ->
            ( { model | isViewerLoading = isLoading }, Cmd.none )

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

        UserEndedSidebarResize ->
            ( { model | sidebarDrag = Nothing }, Cmd.none )

        UserStartedSidebarResize clientX ->
            ( { model | sidebarDrag = Just { startWidth = model.sidebarWidth, startX = clientX } }
            , Cmd.none
            )

        UserChangedZoomLevel zoom ->
            ( { model | zoom = zoom }, Cmd.none )

        ViewportChanged width _ ->
            let
                nextIsMobile =
                    width <= 720

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

        UserClickedZoomIn ->
            updateZoom model zoomInFactor

        UserClickedZoomOut ->
            updateZoom model zoomOutFactor

        UserClickedPageViewImageChoice index ->
            let
                nextModel =
                    { model | pageViewImageIndex = index }
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


handleManifestLoaded : Model -> IIIFManifest -> ( Model, Cmd Msg )
handleManifestLoaded model manifest =
    let
        pagedLayout =
            manifestViewingLayout manifest
                |> isPagedLayout

        viewingDirection =
            toViewingDirection manifest

        pages =
            manifestToPages manifest

        tileSources =
            List.filterMap (primaryImage >> Maybe.map .tileSource) pages

        pageAspects =
            List.map .aspect pages

        viewMode =
            if pagedLayout then
                TwoUp

            else
                OneUp

        shiftByOne =
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
        | canvasIndexMap = canvasIndexMap
        , filters = resetFilters
        , isViewerLoading = False
        , pages = pages
        , rangeIndexMap = rangeIndexMap
        , response = Loaded manifest
        , selectedIndex =
            if List.isEmpty pages then
                Nothing

            else
                Just 0
        , shiftByOne = shiftByOne
        , tileSources = tileSources
        , viewMode = viewMode
      }
    , Cmd.batch
        [ tileSourcesUpdated tileSources
        , pageAspectsUpdated pageAspects
        , zoomLevelUpdated 1
        , layoutConfigUpdated { direction = direction, mode = layoutMode }
        ]
    )


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


httpErrorToString : Http.Error -> String
httpErrorToString err =
    case err of
        Http.BadUrl url ->
            "Bad URL: " ++ url

        Http.Timeout ->
            "Request timed out."

        Http.NetworkError ->
            "Network error."

        Http.BadStatus statusCode ->
            "HTTP error: " ++ String.fromInt statusCode

        Http.BadBody message ->
            "Bad response body: " ++ message


updateZoom : Model -> Float -> ( Model, Cmd Msg )
updateZoom model factor =
    ( model, zoomBy factor )


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
                                    { aspect = page.aspect
                                    , filters = model.filters
                                    , tileSource = image.tileSource
                                    }
                            )
                )
            |> Maybe.withDefault Cmd.none

    else
        Cmd.none


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [ pageIndexChanged ClientNotifiedPageChanged
        , pageIndexChangedInstant ClientNotifiedPageChangedInstant
        , fullscreenChanged ClientNotifiedFullscreenChanged
        , zoomChanged UserChangedZoomLevel
        , viewerLoadingChanged ViewerLoadingChanged
        , Browser.Events.onResize ViewportChanged
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
        Task.attempt ClientNotifiedScrollThumbs delayedTask

    else
        Cmd.none


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


ensureSidebarVisible : SidebarState -> SidebarState
ensureSidebarVisible state =
    case state of
        SidebarHidden ->
            SidebarThumbnails

        _ ->
            state


buildRangeIndexMap : Dict String Int -> List Range -> Dict String (Maybe Int)
buildRangeIndexMap canvasIndex ranges =
    List.foldl
        (\range acc ->
            Dict.union (rangeIndexMapForRange canvasIndex range) acc
        )
        Dict.empty
        ranges


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
