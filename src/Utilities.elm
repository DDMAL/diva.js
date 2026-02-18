module Utilities exposing (disabledIf, find, isNothing)


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


isNothing : Maybe a -> Bool
isNothing maybeVal =
    isJust maybeVal |> not


isJust : Maybe a -> Bool
isJust maybeVal =
    case maybeVal of
        Just _ ->
            True

        Nothing ->
            False
