module ModelTest exposing (suite)

import Auth
import Expect
import IIIF.Image exposing (ImageUri(..))
import IIIF.Language exposing (Language(..))
import IIIF.Presentation exposing (IIIFManifest(..), Image, ImageType(..), ServiceTypes(..), ViewingLayout(..))
import IIIF.Version exposing (IIIFVersion(..))
import Model exposing (Page, PageImage, manifestToPages, primaryImage)
import Test exposing (Test, describe, test)


suite : Test
suite =
    describe "page image and thumbnail selection"
        [ test "uses the canvas thumbnail when one is defined" <|
            \_ ->
                case firstPage (baseManifest (Just staticThumbnail) [ imageApiImage ]) of
                    Just page ->
                        page
                            |> Expect.all
                                [ .thumbUrl >> Expect.equal "https://thumbs.example.org/canvas-thumb.jpg"
                                , .fallbackThumbUrl >> Expect.equal "https://example.org/iiif/canvas-1/full/180,/0/default.jpg"
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
                                , .fallbackThumbUrl >> Expect.equal "https://example.org/images/canvas-1-full.jpg"
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
                                , .canvasId >> Expect.equal "https://example.org/canvas/1"
                                , .width >> Expect.equal (Just 1200)
                                , .height >> Expect.equal (Just 1800)
                                , .images
                                    >> List.map .thumbUrl
                                    >> Expect.equal
                                        [ "https://example.org/iiif/canvas-1/full/180,/0/default.jpg"
                                        , "https://example.org/iiif/canvas-1-alt/full/180,/0/default.jpg"
                                        ]
                                , .images
                                    >> List.map .id
                                    >> Expect.equal
                                        [ "https://example.org/iiif/canvas-1/info.json"
                                        , "https://example.org/iiif/canvas-1-alt/info.json"
                                        ]
                                ]

                    Nothing ->
                        Expect.fail "Expected a page"
        , describe "primaryImage"
            [ test "returns Nothing for an empty image list" <|
                \_ ->
                    pageWithImages []
                        |> primaryImage
                        |> Expect.equal Nothing
            , test "selects the only image even without a primary flag" <|
                \_ ->
                    pageWithImages [ pageImage "only" False ]
                        |> primaryImage
                        |> Expect.equal (Just (pageImage "only" False))
            , test "falls back to the first image when none is primary" <|
                \_ ->
                    pageWithImages [ pageImage "first" False, pageImage "second" False ]
                        |> primaryImage
                        |> Expect.equal (Just (pageImage "first" False))
            , test "selects a later primary ahead of a non-primary first image" <|
                \_ ->
                    pageWithImages [ pageImage "choice" False, pageImage "primary" True ]
                        |> primaryImage
                        |> Expect.equal (Just (pageImage "primary" True))
            , test "selects the first primary when multiple images are primary" <|
                \_ ->
                    pageWithImages [ pageImage "choice" False, pageImage "first-primary" True, pageImage "second-primary" True ]
                        |> primaryImage
                        |> Expect.equal (Just (pageImage "first-primary" True))
            ]
        , test "omits canvases without painted images" <|
            \_ ->
                baseManifest (Just staticThumbnail) []
                    |> manifestToPages Default
                    |> Expect.equal []
        , test "promotes the first choice when no image is explicitly primary" <|
            \_ ->
                let
                    firstChoice =
                        { imageApiImage | imageType = ChoiceImage }
                in
                firstPage (baseManifest Nothing [ firstChoice, secondImageApiImage ])
                    |> Maybe.map
                        (\page ->
                            ( List.map .isPrimary page.images
                            , Maybe.map .id (primaryImage page)
                            , ( page.thumbUrl, page.fallbackThumbUrl )
                            )
                        )
                    |> Expect.equal
                        (Just
                            ( [ True, False ]
                            , Just "https://example.org/iiif/canvas-1/info.json"
                            , ( "https://example.org/iiif/canvas-1/full/180,/0/default.jpg"
                              , "https://example.org/iiif/canvas-1/full/180,/0/default.jpg"
                              )
                            )
                        )
        , test "uses a later primary for both thumbnail URLs" <|
            \_ ->
                firstPage (baseManifest Nothing [ secondImageApiImage, imageApiImage ])
                    |> Maybe.map
                        (\page ->
                            ( Maybe.map .id (primaryImage page)
                            , page.thumbUrl
                            , page.fallbackThumbUrl
                            )
                        )
                    |> Expect.equal
                        (Just
                            ( Just "https://example.org/iiif/canvas-1/info.json"
                            , "https://example.org/iiif/canvas-1/full/180,/0/default.jpg"
                            , "https://example.org/iiif/canvas-1/full/180,/0/default.jpg"
                            )
                        )
        , test "keeps the canvas thumbnail but uses the first primary for its fallback" <|
            \_ ->
                let
                    secondPrimary =
                        { secondImageApiImage | imageType = PrimaryImage }
                in
                firstPage (baseManifest (Just staticThumbnail) [ secondPrimary, imageApiImage ])
                    |> Maybe.map
                        (\page ->
                            ( Maybe.map .id (primaryImage page)
                            , page.thumbUrl
                            , page.fallbackThumbUrl
                            )
                        )
                    |> Expect.equal
                        (Just
                            ( Just "https://example.org/iiif/canvas-1-alt/info.json"
                            , "https://thumbs.example.org/canvas-thumb.jpg"
                            , "https://example.org/iiif/canvas-1-alt/full/180,/0/default.jpg"
                            )
                        )
        ]


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
              , annotationSources = []
              }
            ]
        , ranges = Nothing
        , homepage = Nothing
        , logo = Nothing
        , provider = Nothing
        , thumbnail = Nothing
        , requiredStatement = Nothing
        }


firstPage : IIIFManifest -> Maybe Page
firstPage manifest =
    manifestToPages Default manifest
        |> List.head


imageApiImage : Image
imageApiImage =
    { id = InfoUri { host = "https://example.org", prefix = "/iiif/canvas-1" }
    , label = Nothing
    , imageType = PrimaryImage
    , service = [ ImageService3 ]
    , serviceObjects = []
    }


pageImage : String -> Bool -> PageImage
pageImage id isPrimary =
    { id = id
    , sourceId = id
    , tileSource = id
    , thumbUrl = id ++ "/thumbnail"
    , label = id
    , isPrimary = isPrimary
    , isStatic = False
    , auth = Auth.Unknown
    }


pageWithImages : List PageImage -> Page
pageWithImages images =
    { canvasId = "https://example.org/canvas/1"
    , width = Just 1200
    , height = Just 1800
    , aspect = 1200 / 1800
    , label = "Page 1"
    , thumbUrl = ""
    , fallbackThumbUrl = ""
    , images = images
    }


secondImageApiImage : Image
secondImageApiImage =
    { id = InfoUri { host = "https://example.org", prefix = "/iiif/canvas-1-alt" }
    , label = Nothing
    , imageType = ChoiceImage
    , service = [ ImageService3 ]
    , serviceObjects = []
    }


staticCanvasImage : Image
staticCanvasImage =
    { id = StaticImageUri { host = "https://example.org", prefix = "/images/canvas-1-full.jpg" }
    , label = Nothing
    , imageType = PrimaryImage
    , service = []
    , serviceObjects = []
    }


staticThumbnail : Image
staticThumbnail =
    { id = StaticImageUri { host = "https://thumbs.example.org", prefix = "/canvas-thumb.jpg" }
    , label = Nothing
    , imageType = PrimaryImage
    , service = []
    , serviceObjects = []
    }
