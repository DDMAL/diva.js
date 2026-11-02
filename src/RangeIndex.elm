module RangeIndex exposing
    ( Indexes
    , LabelBounds
    , build
    , containsAnyCanvas
    , empty
    , firstPageIndex
    , labelBounds
    , rangesForCanvas
    , topLevelRanges
    )

import Dict exposing (Dict)
import IIIF.Presentation exposing (Range, RangeItem(..))
import Set exposing (Set)


type Indexes
    = Indexes
        { firstPageIndexes : Dict String (Maybe Int)
        , labelBoundsByRange : Dict String LabelBounds
        , canvasIdsByRange : Dict String (Set String)
        , rangesByCanvas : Dict String (List Range)
        , topLevelRanges : List Range
        }


type alias LabelBounds =
    { firstLabel : Maybe String
    , lastLabel : Maybe String
    }


build : Dict String Int -> Dict String String -> List Range -> Indexes
build canvasIndexes canvasLabels ranges =
    let
        initialState =
            { firstPageIndexes = Dict.empty
            , labelBoundsByRange = Dict.empty
            , canvasIdsByRange = Dict.empty
            , rangeIdsByCanvas = Dict.empty
            , reversedRangesByCanvas = Dict.empty
            }

        finalState =
            List.foldl
                (\range state ->
                    walkRange canvasIndexes canvasLabels [] range state
                        |> Tuple.second
                )
                initialState
                ranges

        rangesByCanvas =
            Dict.map (\_ reversed -> List.reverse reversed) finalState.reversedRangesByCanvas
    in
    Indexes
        { firstPageIndexes = finalState.firstPageIndexes
        , labelBoundsByRange = finalState.labelBoundsByRange
        , canvasIdsByRange = finalState.canvasIdsByRange
        , rangesByCanvas = rangesByCanvas
        , topLevelRanges = ranges
        }


containsAnyCanvas : String -> List String -> Indexes -> Bool
containsAnyCanvas rangeId canvasIds (Indexes indexes) =
    Dict.get rangeId indexes.canvasIdsByRange
        |> Maybe.withDefault Set.empty
        |> (\rangeCanvasIds -> List.any (\canvasId -> Set.member canvasId rangeCanvasIds) canvasIds)


empty : Indexes
empty =
    Indexes
        { firstPageIndexes = Dict.empty
        , labelBoundsByRange = Dict.empty
        , canvasIdsByRange = Dict.empty
        , rangesByCanvas = Dict.empty
        , topLevelRanges = []
        }


firstPageIndex : String -> Indexes -> Maybe Int
firstPageIndex rangeId (Indexes indexes) =
    Dict.get rangeId indexes.firstPageIndexes
        |> Maybe.withDefault Nothing


labelBounds : String -> Indexes -> LabelBounds
labelBounds rangeId (Indexes indexes) =
    Dict.get rangeId indexes.labelBoundsByRange
        |> Maybe.withDefault { firstLabel = Nothing, lastLabel = Nothing }


rangesForCanvas : String -> Indexes -> List Range
rangesForCanvas canvasId (Indexes indexes) =
    Dict.get canvasId indexes.rangesByCanvas
        |> Maybe.withDefault []


topLevelRanges : Indexes -> List Range
topLevelRanges (Indexes indexes) =
    indexes.topLevelRanges


addCanvasMembership : String -> List Range -> BuildState -> BuildState
addCanvasMembership canvasId pathRev state =
    List.foldr
        (\range currentState ->
            let
                seenIds =
                    Dict.get canvasId currentState.rangeIdsByCanvas
                        |> Maybe.withDefault Set.empty
            in
            if Set.member range.id seenIds then
                currentState

            else
                { currentState
                    | rangeIdsByCanvas =
                        Dict.insert canvasId (Set.insert range.id seenIds) currentState.rangeIdsByCanvas
                    , canvasIdsByRange =
                        Dict.update range.id
                            (\maybeCanvasIds -> Just (Set.insert canvasId (Maybe.withDefault Set.empty maybeCanvasIds)))
                            currentState.canvasIdsByRange
                    , reversedRangesByCanvas =
                        Dict.update canvasId
                            (\maybeRanges -> Just (range :: Maybe.withDefault [] maybeRanges))
                            currentState.reversedRangesByCanvas
                }
        )
        state
        pathRev


type alias BuildState =
    { firstPageIndexes : Dict String (Maybe Int)
    , labelBoundsByRange : Dict String LabelBounds
    , canvasIdsByRange : Dict String (Set String)
    , rangeIdsByCanvas : Dict String (Set String)
    , reversedRangesByCanvas : Dict String (List Range)
    }


combine : Summary -> Summary -> Summary
combine earlier later =
    { firstPageIndex = firstJust earlier.firstPageIndex later.firstPageIndex
    , firstLabel = firstJust earlier.firstLabel later.firstLabel
    , lastLabel = firstJust later.lastLabel earlier.lastLabel
    }


emptySummary : Summary
emptySummary =
    { firstPageIndex = Nothing
    , firstLabel = Nothing
    , lastLabel = Nothing
    }


firstJust : Maybe a -> Maybe a -> Maybe a
firstJust first second =
    case first of
        Just _ ->
            first

        Nothing ->
            second


indexItem : Dict String Int -> Dict String String -> List Range -> RangeItem -> ( Summary, BuildState ) -> ( Summary, BuildState )
indexItem canvasIndexes canvasLabels pathRev item ( accumulated, state ) =
    case item of
        RangeCanvas canvasId ->
            let
                nextState =
                    addCanvasMembership canvasId pathRev state

                canvasSummary =
                    { firstPageIndex = Dict.get canvasId canvasIndexes
                    , firstLabel = Dict.get canvasId canvasLabels
                    , lastLabel = Dict.get canvasId canvasLabels
                    }
            in
            ( combine accumulated canvasSummary, nextState )

        RangeRange nestedRange ->
            let
                ( nestedSummary, nextState ) =
                    walkRange canvasIndexes canvasLabels pathRev nestedRange state
            in
            ( combine accumulated nestedSummary, nextState )


type alias Summary =
    { firstPageIndex : Maybe Int
    , firstLabel : Maybe String
    , lastLabel : Maybe String
    }


walkRange : Dict String Int -> Dict String String -> List Range -> Range -> BuildState -> ( Summary, BuildState )
walkRange canvasIndexes canvasLabels parentPathRev range state =
    let
        pathRev =
            range :: parentPathRev

        ( summary, nextState ) =
            List.foldl
                (indexItem canvasIndexes canvasLabels pathRev)
                ( emptySummary, state )
                range.items

        indexedState =
            { nextState
                | firstPageIndexes = Dict.insert range.id summary.firstPageIndex nextState.firstPageIndexes
                , labelBoundsByRange =
                    Dict.insert range.id
                        { firstLabel = summary.firstLabel
                        , lastLabel = summary.lastLabel
                        }
                        nextState.labelBoundsByRange
            }
    in
    ( summary, indexedState )
