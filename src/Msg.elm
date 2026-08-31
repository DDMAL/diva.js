module Msg exposing (Msg(..))

import Auth
import Filters exposing (FilterFloatValue, FilterIntValue, FilterStringValue, FilterToggle)
import Http
import IIIF.Annotation exposing (Annotation)
import IIIF.Presentation exposing (IIIFManifest, IIIFResource)


type Msg
    = AuthEvent Auth.Event
    | ClientRequestedLayoutMode String
    | ClientRequestedResource String String
    | ClientNotifiedFullscreenChanged Bool
    | ClientNotifiedPageChanged Int
    | ClientNotifiedPageChangedInstant Int
    | ClientNotifiedScrollThumbs
    | ServerRespondedWithCollectionItem String (Result Http.Error IIIFResource)
    | ServerRespondedWithManifestFromCollection String (Result Http.Error IIIFManifest)
    | ServerRespondedWithResource (Result Http.Error IIIFResource)
    | ServerRespondedWithRequestedResource String String (Result Http.Error IIIFResource)
    | UserAppliedFilterJson
    | UserChangedZoomLevel Float
    | UserClickedCloseManifestInfo
    | UserClickedClosePageView
    | UserClickedCollectionItem String
    | UserClickedManifestItem String String
    | UserClickedOpenManifestInfo
    | UserClickedOpenPageView
    | UserClickedPageViewImageChoice Int
    | UserClickedPageViewNext
    | UserClickedPageViewPrev
    | UserClickedRange (Maybe Int)
    | UserClickedSaveFilteredImage
    | UserClickedThumbnail Int
    | UserClickedZoomIn
    | UserClickedZoomOut
    | UserCopiedFilterJson
    | UserDraggedCollectionSidebarResize Int
    | UserDraggedSidebarResize Int
    | UserEndedCollectionSidebarResize
    | UserEndedSidebarResize
    | UserResetAllFilters
    | UserResetAltColourAdjust
    | UserSelectedContentsIndex
    | UserSelectedContentsPages
    | UserStartedCollectionSidebarResize Int
    | UserStartedSidebarResize Int
    | UserToggledContents
    | UserToggledCollectionSidebar
    | UserToggledFilter FilterToggle Bool
    | UserToggledFilterGroup String
    | UserToggledFullscreen
    | UserToggledMetadata
    | UserToggledPageViewFullscreen
    | UserToggledPageViewSidebar
    | UserToggledRangeMetadata String
    | UserToggledShiftByOne
    | UserToggledSidebar
    | UserToggledThumbnails
    | UserToggledTwoUp
    | UserUpdatedFilterFloat FilterFloatValue String
    | UserUpdatedFilterInt FilterIntValue String
    | UserUpdatedFilterJsonInput String
    | UserUpdatedFilterString FilterStringValue String
    | ViewerLoadingChanged Bool
    | ViewportChanged Int
    | ViewerLoadedPage Int
    | ServerRespondedWithAnnotations String (Result Http.Error (List Annotation))
    | UserToggledAnnotations
