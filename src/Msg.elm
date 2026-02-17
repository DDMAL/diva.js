module Msg exposing (Msg(..))

import Browser.Dom as Dom
import Filters exposing (FilterFloatValue, FilterIntValue, FilterStringValue, FilterToggle)
import Http
import IIIF.Presentation exposing (IIIFManifest, IIIFResource)


type Msg
    = ClientNotifiedFullscreenChanged Bool
    | ServerRespondedWithManifest (Result Http.Error IIIFManifest)
    | ServerRespondedWithResource (Result Http.Error IIIFResource)
    | UserClickedCollectionItem String
    | ServerRespondedWithCollectionItem String (Result Http.Error IIIFResource)
    | UserClickedManifestItem String String
    | ServerRespondedWithManifestFromCollection (Result Http.Error IIIFManifest)
    | UserToggledCollectionSidebar
    | UserStartedCollectionSidebarResize Int
    | UserDraggedCollectionSidebarResize Int
    | UserEndedCollectionSidebarResize
    | ClientNotifiedPageChanged Int
    | ClientNotifiedPageChangedInstant Int
    | ClientNotifiedScrollThumbs (Result Dom.Error ())
    | UserClickedThumbnail Int
    | UserToggledFilter FilterToggle Bool
    | UserToggledContents
    | UserClickedOpenPageView
    | UserClickedClosePageView
    | UserClickedSaveFilteredImage
    | UserToggledPageViewFullscreen
    | UserToggledPageViewSidebar
    | UserClickedOpenManifestInfo
    | UserClickedCloseManifestInfo
    | UserToggledMobileSidebar
    | UserClosedMobileSidebar
    | UserClickedPageViewPrev
    | UserClickedPageViewNext
    | UserResetAllFilters
    | UserResetAltColourAdjust
    | UserToggledFullscreen
    | UserClickedRange String (Maybe Int)
    | UserToggledMetadata
    | UserSelectedContentsIndex
    | UserSelectedContentsPages
    | UserToggledSidebar
    | UserToggledShiftByOne
    | UserToggledThumbnails
    | UserToggledTwoUp
    | UserUpdatedFilterInt FilterIntValue String
    | UserUpdatedFilterFloat FilterFloatValue String
    | UserUpdatedFilterString FilterStringValue String
    | UserUpdatedFilterJsonInput String
    | UserAppliedFilterJson
    | UserCopiedFilterJson
    | ViewerLoadingChanged Bool
    | UserDraggedSidebarResize Int
    | UserEndedSidebarResize
    | UserStartedSidebarResize Int
    | UserChangedZoomLevel Float
    | ViewportChanged Int Int
    | UserClickedZoomIn
    | UserClickedZoomOut
    | UserClickedPageViewImageChoice Int
    | UserToggledFilterGroup String
