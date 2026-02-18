module Model exposing (CollectionState, ContentsView(..), Model, Page, PageImage, ResourceResponse(..), Response(..), SidebarState(..), ViewMode(..), currentManifest, getPageAt, manifestToPages, pageViewStartIndex, primaryImage)

import Dict exposing (Dict)
import Filters exposing (Filters)
import IIIF.Image exposing (createImageAddress, thumbnailUrlFromInfo)
import IIIF.Language exposing (Language, extractLabelFromLanguageMap)
import IIIF.Presentation exposing (Canvas, IIIFCollection, IIIFManifest, Image, ImageType(..), canvasAspect, canvasLabel, toCanvases)
import Set exposing (Set)
import Utilities exposing (find, isNothing)


type alias CollectionState =
    { collection : IIIFCollection
    , expandedIds : Set String
    , selectedManifestId : Maybe String
    , loadingCollectionIds : Set String
    , loadedCollectionIds : Set String
    }


type ContentsView
    = ContentsIndex
    | ContentsPages


type alias Model =
    { rootElementId : String
    , manifestUrl : String
    , acceptHeaders : List String
    , initialZoom : Maybe Float
    , currentZoom : Maybe Float
    , hasTileSources : Bool
    , pages : List Page
    , selectedIndex : Maybe Int
    , selectedRangeId : Maybe String
    , rangeIndexMap : Dict String (Maybe Int)
    , thumbsInstantScroll : Bool
    , pendingThumbScroll : Maybe Int
    , pageViewOpen : Bool
    , pageViewFullscreen : Bool
    , pageViewSidebarVisible : Bool
    , pageViewImageIndex : Int
    , manifestInfoOpen : Bool
    , filters : Filters
    , filtersJsonInput : String
    , filtersJsonError : Maybe String
    , fullscreen : Bool
    , viewMode : ViewMode
    , shiftByOne : Bool
    , sidebarState : SidebarState
    , mobileSidebarOpen : Bool
    , isMobile : Bool
    , showTitle : Bool
    , isViewerLoading : Bool
    , response : Response
    , sidebarWidth : Int
    , sidebarDrag : Maybe { startX : Int, startWidth : Int }
    , resourceResponse : ResourceResponse
    , collectionSidebarWidth : Int
    , collectionSidebarVisible : Bool
    , collectionSidebarDrag : Maybe { startX : Int, startWidth : Int }
    , filterGroupExpanded : Set String
    , contentsView : ContentsView
    , detectedLanguage : Language
    }


type alias Page =
    { aspect : Float
    , label : String
    , images : List PageImage
    }


type alias PageImage =
    { tileSource : String
    , thumbUrl : String
    , label : String
    , isPrimary : Bool
    }


type ResourceResponse
    = ResourceLoading
    | ResourceLoadedManifest IIIFManifest
    | ResourceLoadedCollection CollectionState
    | ResourceFailed String


type Response
    = NotRequested
    | Loading
    | Loaded IIIFManifest
    | Failed String


type SidebarState
    = SidebarHidden
    | SidebarThumbnails
    | SidebarMetadata
    | SidebarContents


type ViewMode
    = OneUp
    | TwoUp


currentManifest : Model -> Maybe IIIFManifest
currentManifest model =
    case model.resourceResponse of
        ResourceLoadedManifest manifest ->
            Just manifest

        ResourceLoadedCollection _ ->
            case model.response of
                Loaded manifest ->
                    Just manifest

                _ ->
                    Nothing

        _ ->
            Nothing


getPageAt : Int -> List Page -> Maybe Page
getPageAt index pageList =
    List.drop index pageList |> List.head


manifestToPages : Language -> IIIFManifest -> List Page
manifestToPages language iiifManifest =
    toCanvases iiifManifest
        |> List.filterMap (canvasToPage language)


pageViewStartIndex : ViewMode -> Bool -> Int -> Int
pageViewStartIndex viewMode shiftByOne index =
    case viewMode of
        OneUp ->
            index

        TwoUp ->
            if shiftByOne then
                if index == 0 then
                    0

                else if modBy 2 index == 1 then
                    index

                else
                    index - 1

            else
                index - modBy 2 index


primaryImage : Page -> Maybe PageImage
primaryImage page =
    case find .isPrimary page.images of
        Just image ->
            Just image

        Nothing ->
            List.head page.images


canvasToPage : Language -> Canvas -> Maybe Page
canvasToPage language canvas =
    let
        images =
            List.map (iiifImageToPageImage language canvas.images) canvas.images
    in
    if List.isEmpty images then
        Nothing

    else
        Just
            { aspect = canvasAspect canvas
            , label = canvasLabel canvas
            , images = images
            }


iiifImageToPageImage : Language -> List Image -> Image -> PageImage
iiifImageToPageImage language allImages image =
    let
        tileSource =
            createImageAddress image.id

        thumbUrl =
            thumbnailUrlFromInfo tileSource

        label =
            Maybe.map (extractLabelFromLanguageMap language) image.label
                |> Maybe.withDefault "Image"

        isFirst =
            Just image == List.head allImages

        isPrimaryImage =
            find (\img -> img.imageType == PrimaryImage) allImages
                |> isNothing

        isPrimary =
            image.imageType == PrimaryImage || (isPrimaryImage && isFirst)
    in
    { tileSource = tileSource
    , thumbUrl = thumbUrl
    , label = label
    , isPrimary = isPrimary
    }
