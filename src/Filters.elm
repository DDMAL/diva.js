module Filters exposing
    ( FilterFloatValue(..)
    , FilterIntValue(..)
    , FilterStringValue(..)
    , FilterToggle(..)
    , Filters
    , FloatFilterConfig
    , IntFilterConfig
    , StringFilterConfig
    , applyFilterToggle
    , applyFloatFilter
    , applyIntFilter
    , applyStringFilter
    , decodeFilterJson
    , encodeActiveFilters
    , resetAltColourAdjust
    , resetFilters
    , updateFilters
    )

import Dict exposing (Dict)
import Json.Decode as Decode
import Json.Encode as Encode


type FilterFloatValue
    = FloatColourReplaceBlend
    | FloatContrast
    | FloatGamma
    | FloatNormalizeStrength
    | FloatPseudoColourBlue
    | FloatPseudoColourGreen
    | FloatPseudoColourRed
    | FloatUnsharpAmount


type FilterIntValue
    = IntAdaptiveOffset
    | IntAdaptiveWindow
    | IntAltRedGamma
    | IntAltRedSigmoid
    | IntAltRedVibrance
    | IntAltRedHue
    | IntAltRedHueWindow
    | IntAltGreenGamma
    | IntAltGreenSigmoid
    | IntAltGreenHue
    | IntAltGreenHueWindow
    | IntAltGreenVibrance
    | IntAltBlueGamma
    | IntAltBlueSigmoid
    | IntAltBlueHue
    | IntAltBlueHueWindow
    | IntAltBlueVibrance
    | IntBrightness
    | IntCcBlue
    | IntCcGreen
    | IntCcRed
    | IntColourmapCenter
    | IntColourReplaceTolerance
    | IntHue
    | IntMorphKernel
    | IntRotation
    | IntSaturation
    | IntThreshold
    | IntVibrance


type FilterStringValue
    = StringColourmapPreset
    | StringColourReplaceSource
    | StringColourReplaceTarget
    | StringConvolutionPreset
    | StringMorphOperation
    | StringPcaMode
    | StringPseudoColourMode


type FilterToggle
    = ToggleAdaptive
    | ToggleAltBlueGamma
    | ToggleAltBlueHue
    | ToggleAltBlueSigmoid
    | ToggleAltBlueVibrance
    | ToggleAltGreenGamma
    | ToggleAltGreenHue
    | ToggleAltGreenSigmoid
    | ToggleAltGreenVibrance
    | ToggleAltRedGamma
    | ToggleAltRedHue
    | ToggleAltRedSigmoid
    | ToggleAltRedVibrance
    | ToggleBrightness
    | ToggleCcBlue
    | ToggleCcGreen
    | ToggleCcRed
    | ToggleColourmap
    | ToggleColourReplace
    | ToggleColourReplacePreserveLum
    | ToggleContrast
    | ToggleConvolution
    | ToggleFlip
    | ToggleGamma
    | ToggleGrayscale
    | ToggleHue
    | ToggleInvert
    | ToggleMorph
    | ToggleNormalize
    | TogglePca
    | TogglePseudoColour
    | ToggleSaturation
    | ToggleThreshold
    | ToggleUnsharp
    | ToggleVibrance


type alias Filters =
    { rotation : Int
    , flip : Bool
    , grayscale : Bool
    , invert : Bool
    , thresholdEnabled : Bool
    , threshold : Int
    , brightnessEnabled : Bool
    , brightness : Int
    , saturationEnabled : Bool
    , saturation : Int
    , vibranceEnabled : Bool
    , vibrance : Int
    , hueEnabled : Bool
    , hue : Int
    , ccRedEnabled : Bool
    , ccRed : Int
    , ccGreenEnabled : Bool
    , ccGreen : Int
    , ccBlueEnabled : Bool
    , ccBlue : Int
    , contrastEnabled : Bool
    , contrast : Float
    , gammaEnabled : Bool
    , gamma : Float
    , morphEnabled : Bool
    , morphKernel : Int
    , morphOperation : String
    , convolutionEnabled : Bool
    , convolutionPreset : String
    , colourmapEnabled : Bool
    , colourmapPreset : String
    , colourmapCenter : Int
    , pseudoColourEnabled : Bool
    , pseudoColourMode : String
    , pseudoColourRed : Float
    , pseudoColourGreen : Float
    , pseudoColourBlue : Float
    , pcaEnabled : Bool
    , pcaMode : String
    , colourReplaceEnabled : Bool
    , colourReplaceSource : String
    , colourReplaceTarget : String
    , colourReplaceTolerance : Int
    , colourReplaceBlend : Float
    , colourReplacePreserveLum : Bool
    , unsharpEnabled : Bool
    , unsharpAmount : Float
    , normalizeEnabled : Bool
    , normalizeStrength : Float
    , adaptiveEnabled : Bool
    , adaptiveWindow : Int
    , adaptiveOffset : Int
    , altRedGamma : Int
    , altRedGammaEnabled : Bool
    , altRedSigmoid : Int
    , altRedSigmoidEnabled : Bool
    , altRedHue : Int
    , altRedHueEnabled : Bool
    , altRedHueWindow : Int
    , altRedVibranceEnabled : Bool
    , altGreenGamma : Int
    , altGreenGammaEnabled : Bool
    , altGreenSigmoid : Int
    , altGreenSigmoidEnabled : Bool
    , altGreenHue : Int
    , altGreenHueEnabled : Bool
    , altGreenHueWindow : Int
    , altGreenVibranceEnabled : Bool
    , altGreenVibrance : Int
    , altBlueGamma : Int
    , altBlueGammaEnabled : Bool
    , altBlueSigmoid : Int
    , altBlueSigmoidEnabled : Bool
    , altBlueHue : Int
    , altBlueHueEnabled : Bool
    , altBlueHueWindow : Int
    , altBlueVibranceEnabled : Bool
    , altBlueVibrance : Int
    , altRedVibrance : Int
    }


type alias FloatFilterConfig =
    { min : Float
    , max : Float
    , get : Filters -> Float
    , set : Float -> Filters -> Filters
    }


type alias IntFilterConfig =
    { min : Int
    , max : Int
    , get : Filters -> Int
    , set : Int -> Filters -> Filters
    , validate : Maybe (Int -> Int)
    }


type alias StringFilterConfig =
    { get : Filters -> String
    , set : String -> Filters -> Filters
    , validate : String -> Bool
    }


applyFilterToggle : FilterToggle -> Bool -> Filters -> Filters
applyFilterToggle toggle enabled filters =
    case toggle of
        ToggleAdaptive ->
            { filters | adaptiveEnabled = enabled }

        ToggleAltBlueGamma ->
            { filters | altBlueGammaEnabled = enabled }

        ToggleAltBlueHue ->
            { filters | altBlueHueEnabled = enabled }

        ToggleAltBlueSigmoid ->
            { filters | altBlueSigmoidEnabled = enabled }

        ToggleAltBlueVibrance ->
            { filters | altBlueVibranceEnabled = enabled }

        ToggleAltGreenGamma ->
            { filters | altGreenGammaEnabled = enabled }

        ToggleAltGreenHue ->
            { filters | altGreenHueEnabled = enabled }

        ToggleAltGreenSigmoid ->
            { filters | altGreenSigmoidEnabled = enabled }

        ToggleAltGreenVibrance ->
            { filters | altGreenVibranceEnabled = enabled }

        ToggleAltRedGamma ->
            { filters | altRedGammaEnabled = enabled }

        ToggleAltRedHue ->
            { filters | altRedHueEnabled = enabled }

        ToggleAltRedSigmoid ->
            { filters | altRedSigmoidEnabled = enabled }

        ToggleAltRedVibrance ->
            { filters | altRedVibranceEnabled = enabled }

        ToggleBrightness ->
            { filters | brightnessEnabled = enabled }

        ToggleCcBlue ->
            { filters | ccBlueEnabled = enabled }

        ToggleCcGreen ->
            { filters | ccGreenEnabled = enabled }

        ToggleCcRed ->
            { filters | ccRedEnabled = enabled }

        ToggleColourmap ->
            { filters | colourmapEnabled = enabled }

        ToggleColourReplace ->
            { filters | colourReplaceEnabled = enabled }

        ToggleColourReplacePreserveLum ->
            { filters | colourReplacePreserveLum = enabled }

        ToggleContrast ->
            { filters | contrastEnabled = enabled }

        ToggleConvolution ->
            { filters | convolutionEnabled = enabled }

        ToggleFlip ->
            { filters | flip = enabled }

        ToggleGamma ->
            { filters | gammaEnabled = enabled }

        ToggleGrayscale ->
            { filters | grayscale = enabled }

        ToggleHue ->
            { filters | hueEnabled = enabled }

        ToggleInvert ->
            { filters | invert = enabled }

        ToggleMorph ->
            { filters | morphEnabled = enabled }

        ToggleNormalize ->
            { filters | normalizeEnabled = enabled }

        TogglePca ->
            { filters | pcaEnabled = enabled }

        TogglePseudoColour ->
            { filters | pseudoColourEnabled = enabled }

        ToggleSaturation ->
            { filters | saturationEnabled = enabled }

        ToggleThreshold ->
            { filters | thresholdEnabled = enabled }

        ToggleUnsharp ->
            { filters | unsharpEnabled = enabled }

        ToggleVibrance ->
            { filters | vibranceEnabled = enabled }


applyFloatFilter : FilterFloatValue -> String -> Filters -> Filters
applyFloatFilter filterValue raw filters =
    let
        config =
            floatFilterConfig filterValue

        parsed =
            String.toFloat raw

        nextValue =
            Maybe.map (clamp config.min config.max) parsed
                |> Maybe.withDefault (config.get filters)
    in
    config.set nextValue filters


applyIntFilter : FilterIntValue -> String -> Filters -> Filters
applyIntFilter filterValue raw filters =
    let
        config =
            intFilterConfig filterValue

        parsed =
            String.toInt raw

        nextValue =
            case parsed of
                Just v ->
                    let
                        clamped =
                            clamp config.min config.max v
                    in
                    case config.validate of
                        Just validator ->
                            validator clamped

                        Nothing ->
                            clamped

                Nothing ->
                    config.get filters
    in
    config.set nextValue filters


applyStringFilter : FilterStringValue -> String -> Filters -> Filters
applyStringFilter filterValue raw filters =
    let
        config =
            stringFilterConfig filterValue

        nextValue =
            if config.validate raw then
                raw

            else
                config.get filters
    in
    config.set nextValue filters


decodeFilterJson : String -> Result String Filters
decodeFilterJson raw =
    case Decode.decodeString (Decode.dict Decode.value) raw of
        Ok dict ->
            Ok (applyFilterPatch dict)

        Err err ->
            Err (Decode.errorToString err)


encodeActiveFilters : Filters -> String
encodeActiveFilters filters =
    let
        activeFields =
            []
                |> addIf (filters.rotation /= 0) "rotation" (Encode.int filters.rotation)
                |> addIf filters.flip "flip" (Encode.bool True)
                |> addIf filters.grayscale "grayscale" (Encode.bool True)
                |> addIf filters.invert "invert" (Encode.bool True)
                |> addIf filters.thresholdEnabled "threshold" (Encode.int filters.threshold)
                |> addIf filters.brightnessEnabled "brightness" (Encode.int filters.brightness)
                |> addIf filters.contrastEnabled "contrast" (Encode.float filters.contrast)
                |> addIf filters.gammaEnabled "gamma" (Encode.float filters.gamma)
                |> addIf filters.saturationEnabled "saturation" (Encode.int filters.saturation)
                |> addIf filters.vibranceEnabled "vibrance" (Encode.int filters.vibrance)
                |> addIf filters.hueEnabled "hue" (Encode.int filters.hue)
                |> addIf filters.ccRedEnabled "ccRed" (Encode.int filters.ccRed)
                |> addIf filters.ccGreenEnabled "ccGreen" (Encode.int filters.ccGreen)
                |> addIf filters.ccBlueEnabled "ccBlue" (Encode.int filters.ccBlue)
                |> addIf filters.morphEnabled "morphOperation" (Encode.string filters.morphOperation)
                |> addIf filters.morphEnabled "morphKernel" (Encode.int filters.morphKernel)
                |> addIf filters.convolutionEnabled "convolutionPreset" (Encode.string filters.convolutionPreset)
                |> addIf filters.colourmapEnabled "colourmapPreset" (Encode.string filters.colourmapPreset)
                |> addIf filters.colourmapEnabled "colourmapCenter" (Encode.int filters.colourmapCenter)
                |> addIf filters.pseudoColourEnabled "pseudoColourMode" (Encode.string filters.pseudoColourMode)
                |> addIf filters.pseudoColourEnabled "pseudoColourRed" (Encode.float filters.pseudoColourRed)
                |> addIf filters.pseudoColourEnabled "pseudoColourGreen" (Encode.float filters.pseudoColourGreen)
                |> addIf filters.pseudoColourEnabled "pseudoColourBlue" (Encode.float filters.pseudoColourBlue)
                |> addIf filters.pcaEnabled "pcaMode" (Encode.string filters.pcaMode)
                |> addIf filters.colourReplaceEnabled "colourReplaceSource" (Encode.string filters.colourReplaceSource)
                |> addIf filters.colourReplaceEnabled "colourReplaceTarget" (Encode.string filters.colourReplaceTarget)
                |> addIf filters.colourReplaceEnabled "colourReplaceTolerance" (Encode.int filters.colourReplaceTolerance)
                |> addIf filters.colourReplaceEnabled "colourReplaceBlend" (Encode.float filters.colourReplaceBlend)
                |> addIf filters.colourReplaceEnabled "colourReplacePreserveLum" (Encode.bool filters.colourReplacePreserveLum)
                |> addIf filters.unsharpEnabled "unsharpAmount" (Encode.float filters.unsharpAmount)
                |> addIf filters.normalizeEnabled "normalizeStrength" (Encode.float filters.normalizeStrength)
                |> addIf filters.adaptiveEnabled "adaptiveWindow" (Encode.int filters.adaptiveWindow)
                |> addIf filters.adaptiveEnabled "adaptiveOffset" (Encode.int filters.adaptiveOffset)
                |> addIf filters.altRedGammaEnabled "altRedGamma" (Encode.int filters.altRedGamma)
                |> addIf filters.altRedSigmoidEnabled "altRedSigmoid" (Encode.int filters.altRedSigmoid)
                |> addIf filters.altRedHueEnabled "altRedHue" (Encode.int filters.altRedHue)
                |> addIf filters.altRedHueEnabled "altRedHueWindow" (Encode.int filters.altRedHueWindow)
                |> addIf filters.altRedVibranceEnabled "altRedVibrance" (Encode.int filters.altRedVibrance)
                |> addIf filters.altGreenGammaEnabled "altGreenGamma" (Encode.int filters.altGreenGamma)
                |> addIf filters.altGreenSigmoidEnabled "altGreenSigmoid" (Encode.int filters.altGreenSigmoid)
                |> addIf filters.altGreenHueEnabled "altGreenHue" (Encode.int filters.altGreenHue)
                |> addIf filters.altGreenHueEnabled "altGreenHueWindow" (Encode.int filters.altGreenHueWindow)
                |> addIf filters.altGreenVibranceEnabled "altGreenVibrance" (Encode.int filters.altGreenVibrance)
                |> addIf filters.altBlueGammaEnabled "altBlueGamma" (Encode.int filters.altBlueGamma)
                |> addIf filters.altBlueSigmoidEnabled "altBlueSigmoid" (Encode.int filters.altBlueSigmoid)
                |> addIf filters.altBlueHueEnabled "altBlueHue" (Encode.int filters.altBlueHue)
                |> addIf filters.altBlueHueEnabled "altBlueHueWindow" (Encode.int filters.altBlueHueWindow)
                |> addIf filters.altBlueVibranceEnabled "altBlueVibrance" (Encode.int filters.altBlueVibrance)
    in
    Encode.object activeFields
        |> Encode.encode 2



-- FILTER TOGGLE TYPES


resetAltColourAdjust : Filters -> Filters
resetAltColourAdjust filters =
    { filters
        | altRedGamma = 0
        , altRedGammaEnabled = False
        , altRedSigmoid = 0
        , altRedSigmoidEnabled = False
        , altRedHue = 0
        , altRedHueEnabled = False
        , altRedHueWindow = 8
        , altRedVibranceEnabled = False
        , altGreenGamma = 0
        , altGreenGammaEnabled = False
        , altGreenSigmoid = 0
        , altGreenSigmoidEnabled = False
        , altGreenHue = 0
        , altGreenHueEnabled = False
        , altGreenHueWindow = 8
        , altGreenVibranceEnabled = False
        , altGreenVibrance = 0
        , altBlueGamma = 0
        , altBlueGammaEnabled = False
        , altBlueSigmoid = 0
        , altBlueSigmoidEnabled = False
        , altBlueHue = 0
        , altBlueHueEnabled = False
        , altBlueHueWindow = 8
        , altBlueVibranceEnabled = False
        , altBlueVibrance = 0
        , altRedVibrance = 0
    }


resetFilters : Filters
resetFilters =
    { rotation = 0
    , flip = False
    , grayscale = False
    , invert = False
    , thresholdEnabled = False
    , threshold = 128
    , brightnessEnabled = False
    , brightness = 0
    , saturationEnabled = False
    , saturation = 0
    , vibranceEnabled = False
    , vibrance = 0
    , hueEnabled = False
    , hue = 0
    , ccRedEnabled = False
    , ccRed = 0
    , ccGreenEnabled = False
    , ccGreen = 0
    , ccBlueEnabled = False
    , ccBlue = 0
    , contrastEnabled = False
    , contrast = 1
    , gammaEnabled = False
    , gamma = 1
    , morphEnabled = False
    , morphKernel = 3
    , morphOperation = "erode"
    , convolutionEnabled = False
    , convolutionPreset = "sharpen"
    , colourmapEnabled = False
    , colourmapPreset = "gray"
    , colourmapCenter = 128
    , pseudoColourEnabled = False
    , pseudoColourMode = "rg"
    , pseudoColourRed = 1
    , pseudoColourGreen = 1
    , pseudoColourBlue = 1
    , pcaEnabled = False
    , pcaMode = "pca-rgb"
    , colourReplaceEnabled = False
    , colourReplaceSource = "#ffffff"
    , colourReplaceTarget = "#ffffff"
    , colourReplaceTolerance = 24
    , colourReplaceBlend = 1
    , colourReplacePreserveLum = False
    , unsharpEnabled = False
    , unsharpAmount = 1
    , normalizeEnabled = False
    , normalizeStrength = 1
    , adaptiveEnabled = False
    , adaptiveWindow = 15
    , adaptiveOffset = 10
    , altRedGamma = 0
    , altRedGammaEnabled = False
    , altRedSigmoid = 0
    , altRedSigmoidEnabled = False
    , altRedHue = 0
    , altRedHueEnabled = False
    , altRedHueWindow = 8
    , altRedVibranceEnabled = False
    , altGreenGamma = 0
    , altGreenGammaEnabled = False
    , altGreenSigmoid = 0
    , altGreenSigmoidEnabled = False
    , altGreenHue = 0
    , altGreenHueEnabled = False
    , altGreenHueWindow = 8
    , altGreenVibranceEnabled = False
    , altGreenVibrance = 0
    , altBlueGamma = 0
    , altBlueGammaEnabled = False
    , altBlueSigmoid = 0
    , altBlueSigmoidEnabled = False
    , altBlueHue = 0
    , altBlueHueEnabled = False
    , altBlueHueWindow = 8
    , altBlueVibranceEnabled = False
    , altBlueVibrance = 0
    , altRedVibrance = 0
    }



-- FILTER INT VALUE TYPES


updateFilters : (Filters -> Filters) -> { model | filters : Filters } -> { model | filters : Filters }
updateFilters updater model =
    { model | filters = updater model.filters }


addIf : Bool -> String -> Encode.Value -> List ( String, Encode.Value ) -> List ( String, Encode.Value )
addIf condition key value acc =
    if condition then
        ( key, value ) :: acc

    else
        acc


applyFilterPatch : Dict String Decode.Value -> Filters
applyFilterPatch dict =
    let
        base =
            resetFilters

        rotation =
            decodeInt "rotation" dict

        flip =
            decodeBool "flip" dict

        grayscale =
            decodeBool "grayscale" dict

        invert =
            decodeBool "invert" dict

        threshold =
            decodeInt "threshold" dict

        brightness =
            decodeInt "brightness" dict

        contrast =
            decodeFloat "contrast" dict

        gamma =
            decodeFloat "gamma" dict

        saturation =
            decodeInt "saturation" dict

        vibrance =
            decodeInt "vibrance" dict

        hue =
            decodeInt "hue" dict

        ccRed =
            decodeInt "ccRed" dict

        ccGreen =
            decodeInt "ccGreen" dict

        ccBlue =
            decodeInt "ccBlue" dict

        morphOperation =
            decodeString "morphOperation" dict

        morphKernel =
            decodeInt "morphKernel" dict

        convolutionPreset =
            decodeString "convolutionPreset" dict

        colourmapPreset =
            decodeString "colourmapPreset" dict

        colourmapCenter =
            decodeInt "colourmapCenter" dict

        pseudoColourMode =
            decodeString "pseudoColourMode" dict

        pseudoColourRed =
            decodeFloat "pseudoColourRed" dict

        pseudoColourGreen =
            decodeFloat "pseudoColourGreen" dict

        pseudoColourBlue =
            decodeFloat "pseudoColourBlue" dict

        pcaMode =
            decodeString "pcaMode" dict

        colourReplaceSource =
            decodeString "colourReplaceSource" dict

        colourReplaceTarget =
            decodeString "colourReplaceTarget" dict

        colourReplaceTolerance =
            decodeInt "colourReplaceTolerance" dict

        colourReplaceBlend =
            decodeFloat "colourReplaceBlend" dict

        colourReplacePreserveLum =
            decodeBool "colourReplacePreserveLum" dict

        unsharpAmount =
            decodeFloat "unsharpAmount" dict

        normalizeStrength =
            decodeFloat "normalizeStrength" dict

        adaptiveWindow =
            decodeInt "adaptiveWindow" dict

        adaptiveOffset =
            decodeInt "adaptiveOffset" dict

        altRedGamma =
            decodeInt "altRedGamma" dict

        altRedSigmoid =
            decodeInt "altRedSigmoid" dict

        altRedHue =
            decodeInt "altRedHue" dict

        altRedHueWindow =
            decodeInt "altRedHueWindow" dict

        altRedVibrance =
            decodeInt "altRedVibrance" dict

        altGreenGamma =
            decodeInt "altGreenGamma" dict

        altGreenSigmoid =
            decodeInt "altGreenSigmoid" dict

        altGreenHue =
            decodeInt "altGreenHue" dict

        altGreenHueWindow =
            decodeInt "altGreenHueWindow" dict

        altGreenVibrance =
            decodeInt "altGreenVibrance" dict

        altBlueGamma =
            decodeInt "altBlueGamma" dict

        altBlueSigmoid =
            decodeInt "altBlueSigmoid" dict

        altBlueHue =
            decodeInt "altBlueHue" dict

        altBlueHueWindow =
            decodeInt "altBlueHueWindow" dict

        altBlueVibrance =
            decodeInt "altBlueVibrance" dict
    in
    base
        |> applyMaybe rotation (\v f -> { f | rotation = v })
        |> applyMaybe flip (\v f -> { f | flip = v })
        |> applyMaybe grayscale (\v f -> { f | grayscale = v })
        |> applyMaybe invert (\v f -> { f | invert = v })
        |> applyMaybe threshold (\v f -> { f | thresholdEnabled = True, threshold = v })
        |> applyMaybe brightness (\v f -> { f | brightnessEnabled = True, brightness = v })
        |> applyMaybe contrast (\v f -> { f | contrastEnabled = True, contrast = v })
        |> applyMaybe gamma (\v f -> { f | gammaEnabled = True, gamma = v })
        |> applyMaybe saturation (\v f -> { f | saturationEnabled = True, saturation = v })
        |> applyMaybe vibrance (\v f -> { f | vibranceEnabled = True, vibrance = v })
        |> applyMaybe hue (\v f -> { f | hueEnabled = True, hue = v })
        |> applyMaybe ccRed (\v f -> { f | ccRedEnabled = True, ccRed = v })
        |> applyMaybe ccGreen (\v f -> { f | ccGreenEnabled = True, ccGreen = v })
        |> applyMaybe ccBlue (\v f -> { f | ccBlueEnabled = True, ccBlue = v })
        |> applyMaybe morphOperation (\v f -> { f | morphEnabled = True, morphOperation = v })
        |> applyMaybe morphKernel (\v f -> { f | morphEnabled = True, morphKernel = v })
        |> applyMaybe convolutionPreset (\v f -> { f | convolutionEnabled = True, convolutionPreset = v })
        |> applyMaybe colourmapPreset (\v f -> { f | colourmapEnabled = True, colourmapPreset = v })
        |> applyMaybe colourmapCenter (\v f -> { f | colourmapEnabled = True, colourmapCenter = v })
        |> applyMaybe pseudoColourMode (\v f -> { f | pseudoColourEnabled = True, pseudoColourMode = v })
        |> applyMaybe pseudoColourRed (\v f -> { f | pseudoColourEnabled = True, pseudoColourRed = v })
        |> applyMaybe pseudoColourGreen (\v f -> { f | pseudoColourEnabled = True, pseudoColourGreen = v })
        |> applyMaybe pseudoColourBlue (\v f -> { f | pseudoColourEnabled = True, pseudoColourBlue = v })
        |> applyMaybe pcaMode (\v f -> { f | pcaEnabled = True, pcaMode = v })
        |> applyMaybe colourReplaceSource (\v f -> { f | colourReplaceEnabled = True, colourReplaceSource = v })
        |> applyMaybe colourReplaceTarget (\v f -> { f | colourReplaceEnabled = True, colourReplaceTarget = v })
        |> applyMaybe colourReplaceTolerance (\v f -> { f | colourReplaceEnabled = True, colourReplaceTolerance = v })
        |> applyMaybe colourReplaceBlend (\v f -> { f | colourReplaceEnabled = True, colourReplaceBlend = v })
        |> applyMaybe colourReplacePreserveLum (\v f -> { f | colourReplaceEnabled = True, colourReplacePreserveLum = v })
        |> applyMaybe unsharpAmount (\v f -> { f | unsharpEnabled = True, unsharpAmount = v })
        |> applyMaybe normalizeStrength (\v f -> { f | normalizeEnabled = True, normalizeStrength = v })
        |> applyMaybe adaptiveWindow (\v f -> { f | adaptiveEnabled = True, adaptiveWindow = v })
        |> applyMaybe adaptiveOffset (\v f -> { f | adaptiveEnabled = True, adaptiveOffset = v })
        |> applyMaybe altRedGamma (\v f -> { f | altRedGamma = v, altRedGammaEnabled = True })
        |> applyMaybe altRedSigmoid (\v f -> { f | altRedSigmoid = v, altRedSigmoidEnabled = True })
        |> applyMaybe altRedHue (\v f -> { f | altRedHue = v, altRedHueEnabled = True })
        |> applyMaybe altRedHueWindow (\v f -> { f | altRedHueEnabled = True, altRedHueWindow = v })
        |> applyMaybe altRedVibrance (\v f -> { f | altRedVibranceEnabled = True, altRedVibrance = v })
        |> applyMaybe altGreenGamma (\v f -> { f | altGreenGamma = v, altGreenGammaEnabled = True })
        |> applyMaybe altGreenSigmoid (\v f -> { f | altGreenSigmoid = v, altGreenSigmoidEnabled = True })
        |> applyMaybe altGreenHue (\v f -> { f | altGreenHue = v, altGreenHueEnabled = True })
        |> applyMaybe altGreenHueWindow (\v f -> { f | altGreenHueEnabled = True, altGreenHueWindow = v })
        |> applyMaybe altGreenVibrance (\v f -> { f | altGreenVibranceEnabled = True, altGreenVibrance = v })
        |> applyMaybe altBlueGamma (\v f -> { f | altBlueGamma = v, altBlueGammaEnabled = True })
        |> applyMaybe altBlueSigmoid (\v f -> { f | altBlueSigmoid = v, altBlueSigmoidEnabled = True })
        |> applyMaybe altBlueHue (\v f -> { f | altBlueHue = v, altBlueHueEnabled = True })
        |> applyMaybe altBlueHueWindow (\v f -> { f | altBlueHueEnabled = True, altBlueHueWindow = v })
        |> applyMaybe altBlueVibrance (\v f -> { f | altBlueVibranceEnabled = True, altBlueVibrance = v })


applyMaybe : Maybe a -> (a -> Filters -> Filters) -> Filters -> Filters
applyMaybe maybeValue updater filters =
    case maybeValue of
        Just value ->
            updater value filters

        Nothing ->
            filters


decodeBool : String -> Dict String Decode.Value -> Maybe Bool
decodeBool key dict =
    decodeMaybe Decode.bool key dict


decodeFloat : String -> Dict String Decode.Value -> Maybe Float
decodeFloat key dict =
    decodeMaybe
        (Decode.oneOf
            [ Decode.float
            , Decode.int |> Decode.map toFloat
            ]
        )
        key
        dict



-- FILTER FLOAT VALUE TYPES


decodeInt : String -> Dict String Decode.Value -> Maybe Int
decodeInt key dict =
    decodeMaybe Decode.int key dict


decodeMaybe : Decode.Decoder a -> String -> Dict String Decode.Value -> Maybe a
decodeMaybe decoder key dict =
    Dict.get key dict
        |> Maybe.andThen (\value -> Decode.decodeValue decoder value |> Result.toMaybe)


decodeString : String -> Dict String Decode.Value -> Maybe String
decodeString key dict =
    decodeMaybe Decode.string key dict


ensureOdd : Int -> Int
ensureOdd v =
    if modBy 2 v == 0 then
        v + 1

    else
        v



-- FILTER STRING VALUE TYPES


floatFilterConfig : FilterFloatValue -> FloatFilterConfig
floatFilterConfig value =
    case value of
        FloatColourReplaceBlend ->
            { min = 0, max = 1, get = .colourReplaceBlend, set = \v f -> { f | colourReplaceBlend = v } }

        FloatContrast ->
            { min = 0, max = 4, get = .contrast, set = \v f -> { f | contrast = v } }

        FloatGamma ->
            { min = 0.1, max = 4, get = .gamma, set = \v f -> { f | gamma = v } }

        FloatNormalizeStrength ->
            { min = 0, max = 2, get = .normalizeStrength, set = \v f -> { f | normalizeStrength = v } }

        FloatPseudoColourBlue ->
            { min = 0, max = 2, get = .pseudoColourBlue, set = \v f -> { f | pseudoColourBlue = v } }

        FloatPseudoColourGreen ->
            { min = 0, max = 2, get = .pseudoColourGreen, set = \v f -> { f | pseudoColourGreen = v } }

        FloatPseudoColourRed ->
            { min = 0, max = 2, get = .pseudoColourRed, set = \v f -> { f | pseudoColourRed = v } }

        FloatUnsharpAmount ->
            { min = 0, max = 3, get = .unsharpAmount, set = \v f -> { f | unsharpAmount = v } }


intFilterConfig : FilterIntValue -> IntFilterConfig
intFilterConfig value =
    case value of
        IntAdaptiveOffset ->
            { min = -50, max = 50, get = .adaptiveOffset, set = \v f -> { f | adaptiveOffset = v }, validate = Nothing }

        IntAdaptiveWindow ->
            { min = 3, max = 51, get = .adaptiveWindow, set = \v f -> { f | adaptiveWindow = v }, validate = Just ensureOdd }

        IntAltRedGamma ->
            { min = 0, max = 100, get = .altRedGamma, set = \v f -> { f | altRedGamma = v }, validate = Nothing }

        IntAltRedSigmoid ->
            { min = 0, max = 100, get = .altRedSigmoid, set = \v f -> { f | altRedSigmoid = v }, validate = Nothing }

        IntAltRedVibrance ->
            { min = 0, max = 100, get = .altRedVibrance, set = \v f -> { f | altRedVibrance = v }, validate = Nothing }

        IntAltRedHue ->
            { min = -100, max = 100, get = .altRedHue, set = \v f -> { f | altRedHue = v }, validate = Nothing }

        IntAltRedHueWindow ->
            { min = 2, max = 30, get = .altRedHueWindow, set = \v f -> { f | altRedHueWindow = v }, validate = Nothing }

        IntAltGreenGamma ->
            { min = 0, max = 100, get = .altGreenGamma, set = \v f -> { f | altGreenGamma = v }, validate = Nothing }

        IntAltGreenSigmoid ->
            { min = 0, max = 100, get = .altGreenSigmoid, set = \v f -> { f | altGreenSigmoid = v }, validate = Nothing }

        IntAltGreenHue ->
            { min = -100, max = 100, get = .altGreenHue, set = \v f -> { f | altGreenHue = v }, validate = Nothing }

        IntAltGreenHueWindow ->
            { min = 2, max = 30, get = .altGreenHueWindow, set = \v f -> { f | altGreenHueWindow = v }, validate = Nothing }

        IntAltGreenVibrance ->
            { min = 0, max = 100, get = .altGreenVibrance, set = \v f -> { f | altGreenVibrance = v }, validate = Nothing }

        IntAltBlueGamma ->
            { min = 0, max = 100, get = .altBlueGamma, set = \v f -> { f | altBlueGamma = v }, validate = Nothing }

        IntAltBlueSigmoid ->
            { min = 0, max = 100, get = .altBlueSigmoid, set = \v f -> { f | altBlueSigmoid = v }, validate = Nothing }

        IntAltBlueHue ->
            { min = -100, max = 100, get = .altBlueHue, set = \v f -> { f | altBlueHue = v }, validate = Nothing }

        IntAltBlueHueWindow ->
            { min = 2, max = 30, get = .altBlueHueWindow, set = \v f -> { f | altBlueHueWindow = v }, validate = Nothing }

        IntAltBlueVibrance ->
            { min = 0, max = 100, get = .altBlueVibrance, set = \v f -> { f | altBlueVibrance = v }, validate = Nothing }

        IntBrightness ->
            { min = -255, max = 255, get = .brightness, set = \v f -> { f | brightness = v }, validate = Nothing }

        IntCcBlue ->
            { min = -100, max = 100, get = .ccBlue, set = \v f -> { f | ccBlue = v }, validate = Nothing }

        IntCcGreen ->
            { min = -100, max = 100, get = .ccGreen, set = \v f -> { f | ccGreen = v }, validate = Nothing }

        IntCcRed ->
            { min = -100, max = 100, get = .ccRed, set = \v f -> { f | ccRed = v }, validate = Nothing }

        IntColourmapCenter ->
            { min = 0, max = 255, get = .colourmapCenter, set = \v f -> { f | colourmapCenter = v }, validate = Nothing }

        IntColourReplaceTolerance ->
            { min = 0, max = 255, get = .colourReplaceTolerance, set = \v f -> { f | colourReplaceTolerance = v }, validate = Nothing }

        IntHue ->
            { min = -100, max = 100, get = .hue, set = \v f -> { f | hue = v }, validate = Nothing }

        IntMorphKernel ->
            { min = 3, max = 7, get = .morphKernel, set = \v f -> { f | morphKernel = v }, validate = Just validateMorphKernel }

        IntRotation ->
            { min = -180, max = 180, get = .rotation, set = \v f -> { f | rotation = v }, validate = Nothing }

        IntSaturation ->
            { min = -100, max = 100, get = .saturation, set = \v f -> { f | saturation = v }, validate = Nothing }

        IntThreshold ->
            { min = 0, max = 255, get = .threshold, set = \v f -> { f | threshold = v }, validate = Nothing }

        IntVibrance ->
            { min = -100, max = 100, get = .vibrance, set = \v f -> { f | vibrance = v }, validate = Nothing }


stringFilterConfig : FilterStringValue -> StringFilterConfig
stringFilterConfig value =
    case value of
        StringColourmapPreset ->
            { get = .colourmapPreset
            , set = \v f -> { f | colourmapPreset = v }
            , validate = \v -> List.member v [ "gray", "hot", "cool" ]
            }

        StringColourReplaceSource ->
            { get = .colourReplaceSource
            , set = \v f -> { f | colourReplaceSource = v }
            , validate = always True
            }

        StringColourReplaceTarget ->
            { get = .colourReplaceTarget
            , set = \v f -> { f | colourReplaceTarget = v }
            , validate = always True
            }

        StringConvolutionPreset ->
            { get = .convolutionPreset
            , set = \v f -> { f | convolutionPreset = v }
            , validate = \v -> List.member v [ "sharpen", "blur", "edge", "emboss" ]
            }

        StringMorphOperation ->
            { get = .morphOperation
            , set = \v f -> { f | morphOperation = v }
            , validate = \v -> v == "erode" || v == "dilate"
            }

        StringPcaMode ->
            { get = .pcaMode
            , set = \v f -> { f | pcaMode = v }
            , validate = \v -> List.member v [ "pca-rgb", "pca1", "pca2", "pca3" ]
            }

        StringPseudoColourMode ->
            { get = .pseudoColourMode
            , set = \v f -> { f | pseudoColourMode = v }
            , validate = \v -> List.member v [ "rg", "gb", "rb", "luma", "cmy", "heat" ]
            }


validateMorphKernel : Int -> Int
validateMorphKernel v =
    if v == 3 || v == 5 || v == 7 then
        v

    else
        3
