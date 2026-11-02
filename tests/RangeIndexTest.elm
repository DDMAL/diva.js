module RangeIndexTest exposing (suite)

import Dict
import Expect
import IIIF.Language exposing (Language(..), LanguageValues(..))
import IIIF.Presentation exposing (Range, RangeItem(..))
import RangeIndex
import Test exposing (Test, describe, test)


suite : Test
suite =
    describe "manifest range indexes"
        [ test "returns matching ranges in parent-first order and deduplicates repeated canvas references" <|
            \_ ->
                let
                    indexes =
                        testIndexes
                in
                Expect.all
                    [ \_ ->
                        RangeIndex.rangesForCanvas "canvas-1" indexes
                            |> List.map .id
                            |> Expect.equal [ "parent", "child" ]
                    , \_ ->
                        RangeIndex.rangesForCanvas "canvas-2" indexes
                            |> List.map .id
                            |> Expect.equal [ "parent", "child" ]
                    ]
                    ()
        , test "keeps first-page navigation and first/last labels in manifest order" <|
            \_ ->
                let
                    indexes =
                        testIndexes
                in
                Expect.all
                    [ \_ ->
                        RangeIndex.firstPageIndex "parent" indexes
                            |> Expect.equal (Just 0)
                    , \_ ->
                        RangeIndex.firstPageIndex "child" indexes
                            |> Expect.equal (Just 0)
                    , \_ ->
                        RangeIndex.labelBounds "parent" indexes
                            |> Expect.equal { firstLabel = Just "Folio 1", lastLabel = Just "Folio 1" }
                    , \_ ->
                        RangeIndex.labelBounds "child" indexes
                            |> Expect.equal { firstLabel = Just "Folio 1", lastLabel = Just "Folio 2" }
                    , \_ ->
                        RangeIndex.containsAnyCanvas "parent" [ "canvas-2" ] indexes
                            |> Expect.equal True
                    , \_ ->
                        RangeIndex.containsAnyCanvas "empty" [ "canvas-1" ] indexes
                            |> Expect.equal False
                    ]
                    ()
        , test "preserves empty and missing-canvas ranges without inventing page indexes" <|
            \_ ->
                let
                    indexes =
                        RangeIndex.build canvasIndexes canvasLabels [ emptyRange, missingOnlyRange ]
                in
                Expect.all
                    [ \_ ->
                        RangeIndex.firstPageIndex "empty" indexes
                            |> Expect.equal Nothing
                    , \_ ->
                        RangeIndex.firstPageIndex "missing-only" indexes
                            |> Expect.equal Nothing
                    , \_ ->
                        RangeIndex.labelBounds "empty" indexes
                            |> Expect.equal { firstLabel = Nothing, lastLabel = Nothing }
                    , \_ ->
                        RangeIndex.rangesForCanvas "unknown-canvas" indexes
                            |> List.map .id
                            |> Expect.equal [ "missing-only" ]
                    ]
                    ()
        , test "retains top-level order" <|
            \_ ->
                testIndexes
                    |> RangeIndex.topLevelRanges
                    |> List.map .id
                    |> Expect.equal [ "parent", "empty" ]
        ]


canvasIndexes : Dict.Dict String Int
canvasIndexes =
    Dict.fromList
        [ ( "canvas-1", 0 )
        , ( "canvas-2", 1 )
        ]


canvasLabels : Dict.Dict String String
canvasLabels =
    Dict.fromList
        [ ( "canvas-1", "Folio 1" )
        , ( "canvas-2", "Folio 2" )
        ]


childRange : Range
childRange =
    { id = "child"
    , label = languageMap "Child"
    , items = [ RangeCanvas "canvas-1", RangeCanvas "canvas-2" ]
    , metadata = []
    }


emptyRange : Range
emptyRange =
    { id = "empty"
    , label = languageMap "Empty"
    , items = []
    , metadata = []
    }


languageMap : String -> List LanguageValues
languageMap label =
    [ LanguageValues (LanguageCode "en") [ label ] ]


missingOnlyRange : Range
missingOnlyRange =
    { id = "missing-only"
    , label = languageMap "Missing"
    , items = [ RangeCanvas "unknown-canvas" ]
    , metadata = []
    }


parentRange : Range
parentRange =
    { id = "parent"
    , label = languageMap "Parent"
    , items =
        [ RangeCanvas "unknown-canvas"
        , RangeCanvas "canvas-1"
        , RangeRange childRange
        , RangeCanvas "canvas-1"
        ]
    , metadata = []
    }


testIndexes : RangeIndex.Indexes
testIndexes =
    RangeIndex.build canvasIndexes canvasLabels [ parentRange, emptyRange ]
