module Utilities exposing (choose, disabledIf, find, isNothing, orElse, unpack)


choose : Bool -> (() -> a) -> (() -> a) -> a
choose predicate isTrue isFalse =
    if predicate then
        isTrue ()

    else
        isFalse ()


unpack : (() -> b) -> (a -> b) -> Maybe a -> b
unpack default f m =
    case m of
        Just a ->
            f a

        Nothing ->
            default ()


isJust : Maybe a -> Bool
isJust maybeVal =
    case maybeVal of
        Just _ ->
            True

        Nothing ->
            False


isNothing : Maybe a -> Bool
isNothing maybeVal =
    isJust maybeVal |> not


disabledIf : Bool -> msg -> Maybe msg
disabledIf disabled msg =
    if disabled then
        Nothing

    else
        Just msg


{-| Find the first element that satisfies a predicate and return
Just that element. If none match, return Nothing.

    find (\num -> num > 5) [ 2, 4, 6, 8 ]
    --> Just 6

-}
find : (a -> Bool) -> List a -> Maybe a
find predicate list =
    case list of
        [] ->
            Nothing

        first :: rest ->
            if predicate first then
                Just first

            else
                find predicate rest


{-| Piping-friendly version of [`or`](#or).

    Just 5
        |> orElse (Just 4)
    --> Just 5

    orElse (Just 4) (Just 5)
    --> Just 5

    List.head []
        |> orElse (List.head [ 4 ])
    --> Just 4

-}
orElse : Maybe a -> Maybe a -> Maybe a
orElse ma mb =
    case mb of
        Just _ ->
            mb

        Nothing ->
            ma
