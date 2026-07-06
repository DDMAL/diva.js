module ModelTest exposing (suite)

import Expect
import IIIF.Image exposing (ImageUri(..))
import IIIF.Language exposing (Language(..))
import IIIF.Presentation exposing (IIIFManifest(..), Image, ImageType(..), ServiceTypes(..), ViewingLayout(..))
import IIIF.Version exposing (IIIFVersion(..))
import Model exposing (Page, manifestToPages)
import Test exposing (Test, describe, test)


baseManifest : Maybe Image -> List Image -> IIIFManifest
baseManifest thumbnail images =
    IIIFManifest IIIFV3
        { id = "https://example.org/manifest.json"
        , label = []
        , metadata = []
        , viewingDirection = IIIF.Presentation.LeftToRight
        , summary = Nothing
        , viewingLayout = LayoutV3 []
        , canvases =
            [ { id = "https://example.org/canvas/1"
              , label = Nothing
              , width = Just 1200
              , height = Just 1800
              , images = images
              , thumbnail = thumbnail
              , viewingLayout = Nothing
              }
            ]
        , ranges = Nothing
        , homepage = Nothing
        , logo = Nothing
        , provider = Nothing
        , thumbnail = Nothing
        , requiredStatement = Nothing
        }


staticThumbnail : Image
staticThumbnail =
    { id = StaticImageUri { host = "https://thumbs.example.org", prefix = "/canvas-thumb.jpg" }
    , label = Nothing
    , imageType = PrimaryImage
    , service = []
    }


imageApiImage : Image
imageApiImage =
    { id = InfoUri { host = "https://example.org", prefix = "/iiif/canvas-1" }
    , label = Nothing
    , imageType = PrimaryImage
    , service = [ ImageService3 ]
    }


secondImageApiImage : Image
secondImageApiImage =
    { id = InfoUri { host = "https://example.org", prefix = "/iiif/canvas-1-alt" }
    , label = Nothing
    , imageType = ChoiceImage
    , service = [ ImageService3 ]
    }


staticCanvasImage : Image
staticCanvasImage =
    { id = StaticImageUri { host = "https://example.org", prefix = "/images/canvas-1-full.jpg" }
    , label = Nothing
    , imageType = PrimaryImage
    , service = []
    }


firstPage : IIIFManifest -> Maybe Page
firstPage manifest =
    manifestToPages Default manifest
        |> List.head


suite : Test
suite =
    describe "manifestToPages thumbnail selection"
        [ test "uses the canvas thumbnail when one is defined" <|
            \_ ->
                case firstPage (baseManifest (Just staticThumbnail) [ imageApiImage ]) of
                    Just page ->
                        page
                            |> Expect.all
                                [ .thumbUrl >> Expect.equal "https://thumbs.example.org/canvas-thumb.jpg"
                                , .images
                                    >> List.head
                                    >> Maybe.map .isStatic
                                    >> Expect.equal (Just False)
                                ]

                    Nothing ->
                        Expect.fail "Expected a page"
        , test "falls back to the primary image service thumbnail when no canvas thumbnail exists" <|
            \_ ->
                case firstPage (baseManifest Nothing [ imageApiImage ]) of
                    Just page ->
                        page
                            |> Expect.all
                                [ .thumbUrl >> Expect.equal "https://example.org/iiif/canvas-1/full/180,/0/default.jpg"
                                , .images
                                    >> List.head
                                    >> Maybe.map .isStatic
                                    >> Expect.equal (Just False)
                                ]

                    Nothing ->
                        Expect.fail "Expected a page"
        , test "falls back to the full image URL when there is no canvas thumbnail and no image service" <|
            \_ ->
                case firstPage (baseManifest Nothing [ staticCanvasImage ]) of
                    Just page ->
                        page
                            |> Expect.all
                                [ .thumbUrl >> Expect.equal "https://example.org/images/canvas-1-full.jpg"
                                , .images
                                    >> List.head
                                    >> Maybe.map .isStatic
                                    >> Expect.equal (Just True)
                                ]

                    Nothing ->
                        Expect.fail "Expected a page"
        , test "uses a static canvas thumbnail while still flagging the painted image as static" <|
            \_ ->
                case firstPage (baseManifest (Just staticThumbnail) [ staticCanvasImage ]) of
                    Just page ->
                        page
                            |> Expect.all
                                [ .thumbUrl >> Expect.equal "https://thumbs.example.org/canvas-thumb.jpg"
                                , .images
                                    >> List.head
                                    >> Maybe.map .isStatic
                                    >> Expect.equal (Just True)
                                ]

                    Nothing ->
                        Expect.fail "Expected a page"
        , test "keeps page thumbnails and per-image thumbnails separate on multi-image canvases" <|
            \_ ->
                case firstPage (baseManifest (Just staticThumbnail) [ imageApiImage, secondImageApiImage ]) of
                    Just page ->
                        page
                            |> Expect.all
                                [ .thumbUrl >> Expect.equal "https://thumbs.example.org/canvas-thumb.jpg"
                                , .images
                                    >> List.map .thumbUrl
                                    >> Expect.equal
                                        [ "https://example.org/iiif/canvas-1/full/180,/0/default.jpg"
                                        , "https://example.org/iiif/canvas-1-alt/full/180,/0/default.jpg"
                                        ]
                                ]

                    Nothing ->
                        Expect.fail "Expected a page"
        ]
