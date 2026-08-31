module Model exposing (CollectionState, ContentsView(..), Model, Page, PageImage, ResourceResponse(..), Response(..), SidebarState(..), ViewMode(..), currentManifest, getPageAt, manifestToPages, pageViewStartIndex, primaryImage)

import Auth
import Dict exposing (Dict)
import Filters exposing (Filters)
import IIIF.Annotation as IIIFAnnotation
import IIIF.Auth as IIIFAuth
import IIIF.Image exposing (createImageAddress, thumbnailUrlFromInfo)
import IIIF.Language exposing (Language, extractLabelFromLanguageMap)
import IIIF.Presentation exposing (AnnotationSource, Canvas, IIIFCollection, IIIFManifest, Image, ImageType(..), canvasAspect, canvasLabel, toCanvases)
import Json.Decode as Decode
import Json.Encode as Encode
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
    { auth : Auth.Model
    , rootElementId : String
    , manifestUrl : String
    , acceptHeaders : List String
    , initialPage : Decode.Value
    , initialZoom : Maybe Float
    , currentZoom : Maybe Float
    , hasTileSources : Bool
    , pages : List Page
    , selectedIndex : Maybe Int
    , selectedRangeId : Maybe String
    , rangeIndexMap : Dict String (Maybe Int)
    , thumbsInstantScroll : Bool
    , pendingThumbScroll : Maybe Int
    , pendingPublicResource : Maybe String
    , initialResourceSuperseded : Bool
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
    , sidebarPanel : SidebarState
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
    , enableAnnotations : Bool
    , annotationServer : Maybe String
    , annotationsVisible : Bool
    , annotationSources : Dict String (List AnnotationSource)
    , annotationLoading : Set String
    , annotationsByCanvas : Dict String (List IIIFAnnotation.Annotation)
    }


type alias Page =
    { canvasId : String
    , width : Maybe Int
    , height : Maybe Int
    , aspect : Float
    , label : String
    , thumbUrl : String
    , fallbackThumbUrl : String
    , images : List PageImage
    }


type alias PageImage =
    { id : String
    , sourceId : String
    , tileSource : String
    , thumbUrl : String
    , label : String
    , isPrimary : Bool
    , isStatic : Bool
    , auth : Auth.SourceAuth
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


canvasThumbnailUrl : List PageImage -> Canvas -> String
canvasThumbnailUrl images canvas =
    case canvas.thumbnail of
        Just thumbnail ->
            thumbnailUrlForImage thumbnail

        Nothing ->
            case List.filter .isPrimary images |> List.head of
                Just image ->
                    image.thumbUrl

                Nothing ->
                    case List.head images of
                        Just image ->
                            image.thumbUrl

                        Nothing ->
                            ""


canvasToPage : Language -> Canvas -> Maybe Page
canvasToPage language canvas =
    let
        images =
            List.map (iiifImageToPageImage language canvas.images) canvas.images
    in
    if List.isEmpty images then
        Nothing

    else
        let
            thumbUrl =
                canvasThumbnailUrl images canvas

            fallbackThumbUrl =
                images
                    |> List.filter .isPrimary
                    |> List.head
                    |> Maybe.map .thumbUrl
                    |> Maybe.withDefault ""
        in
        Just
            { canvasId = canvas.id
            , width = canvas.width
            , height = canvas.height
            , aspect = canvasAspect canvas
            , label = canvasLabel canvas
            , thumbUrl = thumbUrl
            , fallbackThumbUrl = fallbackThumbUrl
            , images = images
            }


iiifImageToPageImage : Language -> List Image -> Image -> PageImage
iiifImageToPageImage language allImages image =
    let
        tileSource =
            createImageAddress image.id

        isStatic =
            List.isEmpty image.service

        thumbUrl =
            thumbnailUrlForImage image

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
    { id = tileSource
    , sourceId = tileSource
    , tileSource = tileSource
    , thumbUrl = thumbUrl
    , label = label
    , isPrimary = isPrimary
    , isStatic = isStatic
    , auth =
        case Decode.decodeValue IIIFAuth.authServicesDecoder (Encode.list identity image.serviceObjects) of
            Ok discovery ->
                Auth.Discovered discovery

            Err error ->
                Auth.Invalid (Decode.errorToString error)
    }


thumbnailUrlForImage : Image -> String
thumbnailUrlForImage image =
    let
        url =
            createImageAddress image.id
    in
    if List.isEmpty image.service then
        url

    else
        thumbnailUrlFromInfo url
