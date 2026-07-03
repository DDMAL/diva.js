module ModelTest exposing (suite)

{-| Regression tests for <https://github.com/DDMAL/diva.js/issues/562>.

IIIF Presentation 3 allows a painting annotation's image body to omit
`service` entirely (a plain static image with no Image API). elm-iiif 2.0.0
decodes that into an `Image` whose `service` list is empty and whose `id` is
a `StaticImageUri`. These tests build such an `Image`/`Canvas`/`Manifest`
directly (the same shapes elm-iiif's own decoders produce) and check that
`Model.manifestToPages` turns it into a `PageImage` that is flagged
`isStatic` and uses the raw image URL as-is, while a normal Image-API-backed
image still resolves to an `info.json` tile source.

-}

import Expect
import IIIF.Image exposing (ImageUri(..))
import IIIF.Language exposing (Language(..))
import IIIF.Presentation exposing (IIIFManifest(..), Image, ImageType(..), ViewingLayout(..))
import IIIF.Version exposing (IIIFVersion(..))
import Model exposing (manifestToPages)
import Test exposing (Test, describe, test)


baseManifest : List Image -> IIIFManifest
baseManifest images =
    IIIFManifest IIIFV3
        { id = "https://iiif.io/api/cookbook/recipe/0001-mvm-image/manifest.json"
        , label = []
        , metadata = []
        , viewingDirection = IIIF.Presentation.LeftToRight
        , summary = Nothing
        , viewingLayout = LayoutV3 []
        , canvases =
            [ { id = "https://iiif.io/api/cookbook/recipe/0001-mvm-image/canvas/p1"
              , label = Nothing
              , width = Just 1200
              , height = Just 1800
              , images = images
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


{-| A painting annotation body with no `service` — the "REJECTED" shape from
the issue. elm-iiif decodes this `id` as a `StaticImageUri`.
-}
staticImage : Image
staticImage =
    { id =
        StaticImageUri
            { host = "http://iiif.io"
            , prefix = "/api/presentation/2.1/example/fixtures/resources/page1-full.png"
            }
    , label = Nothing
    , imageType = PrimaryImage
    , service = []
    }


{-| The same body, but with an Image API service attached — the "ACCEPTED"
shape from the issue. This must keep working as before.
-}
imageApiImage : Image
imageApiImage =
    { id = InfoUri { host = "https://example.org", prefix = "/iiif" }
    , label = Nothing
    , imageType = PrimaryImage
    , service = [ IIIF.Presentation.ImageService3 ]
    }


firstImage : IIIFManifest -> Maybe Model.PageImage
firstImage manifest =
    manifestToPages Default manifest
        |> List.head
        |> Maybe.andThen (.images >> List.head)


suite : Test
suite =
    describe "manifestToPages"
        [ test "treats a painting image body with no Image API service as a static image" <|
            \_ ->
                case firstImage (baseManifest [ staticImage ]) of
                    Just image ->
                        image
                            |> Expect.all
                                [ .isStatic >> Expect.equal True
                                , .tileSource
                                    >> Expect.equal
                                        "http://iiif.io/api/presentation/2.1/example/fixtures/resources/page1-full.png"
                                , .thumbUrl >> Expect.equal image.tileSource
                                ]

                    Nothing ->
                        Expect.fail "Expected a page image to be produced from a service-less image body"
        , test "still treats an Image-API-backed body as a tiled IIIF source" <|
            \_ ->
                case firstImage (baseManifest [ imageApiImage ]) of
                    Just image ->
                        image
                            |> Expect.all
                                [ .isStatic >> Expect.equal False
                                , .tileSource >> Expect.equal "https://example.org/iiif/info.json"
                                ]

                    Nothing ->
                        Expect.fail "Expected a page image to be produced from an Image-API-backed image body"
        ]
