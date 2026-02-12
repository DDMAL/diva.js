module View.PageViewModal exposing (viewPageViewModal)

import Filters exposing (FilterFloatValue(..), FilterIntValue(..), FilterStringValue(..), FilterToggle(..))
import Html exposing (Html, button, div, img, input, label, option, select, span, text, textarea)
import Html.Attributes as Attr exposing (alt, checked, classList, id, rows, src, type_, value)
import Html.Events exposing (onCheck, onClick, onInput)
import Html.Lazy as Lazy
import IIIF.Language exposing (Language(..), extractLabelFromLanguageMap)
import IIIF.Presentation exposing (toLabel)
import Model exposing (Model, PageImage, ResourceResponse(..), Response(..), currentManifest, getPageAt)
import Msg exposing (Msg(..))
import Set
import Utilites exposing (disabledIf)
import View.Helpers exposing (viewButton, viewIf)
import View.Icons as Icons


type alias RangeRowConfig =
    { label : String
    , min : String
    , max : String
    , step : Maybe String
    , value : String
    , display : String
    , onInput : String -> Msg
    }


type alias ToggleRangeRowConfig =
    { label : String
    , checked : Bool
    , onToggle : FilterToggle
    , min : String
    , max : String
    , step : Maybe String
    , value : String
    , display : String
    , onInput : String -> Msg
    }


viewPageViewModal : Model -> Html Msg
viewPageViewModal model =
    viewIf
        (div
            [ classList
                [ ( "modal-overlay", True )
                , ( "is-fullscreen", model.pageViewFullscreen )
                ]
            ]
            [ div
                [ classList
                    [ ( "modal", True )
                    , ( "is-fullscreen", model.pageViewFullscreen )
                    , ( "is-page-view", not model.pageViewFullscreen )
                    ]
                ]
                [ viewModalHeader model
                , viewModalBody model
                ]
            ]
        )
        model.pageViewOpen


viewModalHeader : Model -> Html Msg
viewModalHeader model =
    let
        manifestTitle =
            manifestTitleFor model

        pageLabel =
            currentPageLabelFor model

        ( prevDisabled, nextDisabled ) =
            case model.selectedIndex of
                Just index ->
                    ( index <= 0
                    , index >= (List.length model.pages - 1)
                    )

                Nothing ->
                    ( True
                    , True
                    )

        ( fullscreenIcon, fullscreenLabel ) =
            if model.pageViewFullscreen then
                ( Icons.fromFullscreen, "Exit fullscreen" )

            else
                ( Icons.toFullscreen, "Fullscreen" )

        ( sidebarIcon, sidebarLabel ) =
            if model.pageViewSidebarVisible then
                ( Icons.hideSidebar, "Hide filters" )

            else
                ( Icons.showSidebar, "Show filters" )
    in
    div
        [ classList [ ( "modal-header", True ) ] ]
        [ div
            [ classList [ ( "modal-title-stack", True ) ] ]
            (div [ classList [ ( "modal-title", True ) ] ] [ text "Page View" ]
                :: (if String.isEmpty manifestTitle then
                        []

                    else
                        [ div [ classList [ ( "modal-subtitle", True ) ] ] [ text manifestTitle ] ]
                   )
                ++ (if String.isEmpty pageLabel then
                        []

                    else
                        [ div [ classList [ ( "modal-subtitle", True ), ( "is-muted", True ) ] ] [ text pageLabel ] ]
                   )
            )
        , div
            [ classList [ ( "modal-actions", True ) ] ]
            [ viewButton
                { label = "Previous Page"
                , icon = Icons.prevPage
                , onClickMsg = disabledIf prevDisabled UserClickedPageViewPrev
                , isFullscreen = model.fullscreen
                }
            , viewButton
                { label = "Next Page"
                , icon = Icons.nextPage
                , onClickMsg = disabledIf nextDisabled UserClickedPageViewNext
                , isFullscreen = model.fullscreen
                }
            , viewButton
                { label = "Save view"
                , icon = Icons.downloadSelection
                , onClickMsg = Just UserClickedSaveFilteredImage
                , isFullscreen = model.fullscreen
                }
            , viewButton
                { label = sidebarLabel
                , icon = sidebarIcon
                , onClickMsg = Just UserToggledPageViewSidebar
                , isFullscreen = model.fullscreen
                }
            , viewButton
                { label = fullscreenLabel
                , icon = fullscreenIcon
                , onClickMsg = Just UserToggledPageViewFullscreen
                , isFullscreen = model.fullscreen
                }
            , viewButton
                { label = "Close"
                , icon = Icons.close
                , onClickMsg = Just UserClickedClosePageView
                , isFullscreen = model.fullscreen
                }
            ]
        ]


manifestTitleFor : Model -> String
manifestTitleFor model =
    currentManifest model
        |> Maybe.map (\m -> toLabel m |> extractLabelFromLanguageMap Default)
        |> Maybe.withDefault ""


currentPageLabelFor : Model -> String
currentPageLabelFor model =
    model.selectedIndex
        |> Maybe.andThen (\index -> getPageAt index model.pages)
        |> Maybe.map .label
        |> Maybe.withDefault ""


viewModalBody : Model -> Html Msg
viewModalBody model =
    let
        currentPage =
            model.selectedIndex
                |> Maybe.andThen (\index -> getPageAt index model.pages)

        hasChoices =
            Maybe.map (\page -> List.length page.images > 1) currentPage
                |> Maybe.withDefault False
    in
    div
        [ classList
            [ ( "modal-body", True )
            , ( "is-no-gap", True )
            , ( "is-fullscreen", model.pageViewFullscreen )
            , ( "is-with-choices", hasChoices )
            , ( "is-no-sidebar", not model.pageViewSidebarVisible )
            , ( "is-with-choices-no-sidebar", hasChoices && not model.pageViewSidebarVisible )
            ]
        ]
        (case ( hasChoices, currentPage, model.pageViewSidebarVisible ) of
            ( True, Just page, True ) ->
                [ viewImageChoicesSidebar page.images model.pageViewImageIndex
                , viewModalViewer model.pageViewFullscreen False
                , viewModalSidebar model
                ]

            ( True, Just page, False ) ->
                [ viewImageChoicesSidebar page.images model.pageViewImageIndex
                , viewModalViewer model.pageViewFullscreen False
                ]

            ( _, _, True ) ->
                [ viewModalViewer model.pageViewFullscreen True
                , viewModalSidebar model
                ]

            _ ->
                [ viewModalViewer model.pageViewFullscreen True
                ]
        )


viewModalViewer : Bool -> Bool -> Html Msg
viewModalViewer fullscreen isOuterLeft =
    div
        [ classList
            [ ( "modal-viewer", True )
            , ( "is-fullscreen", fullscreen )
            , ( "is-outer-left", isOuterLeft )
            ]
        ]
        [ div
            [ classList [ ( "modal-canvas", True ) ]
            , id "filter-viewer"
            ]
            []
        ]


viewModalSidebar : Model -> Html Msg
viewModalSidebar model =
    div
        [ classList [ ( "modal-sidebar", True ) ] ]
        [ Lazy.lazy viewTransformGroup model
        , Lazy.lazy viewToneGroup model
        , Lazy.lazy viewColourAdjustGroup model
        , Lazy.lazy viewMorphologyGroup model
        , Lazy.lazy viewConvolutionGroup model
        , Lazy.lazy viewColourmapGroup model
        , Lazy.lazy viewPseudoColourGroup model
        , Lazy.lazy viewPcaGroup model
        , Lazy.lazy viewAdvancedColourAdjustGroup model
        , Lazy.lazy viewEnhancementGroup model
        , Lazy.lazy viewFilterJsonGroup model
        ]


viewTransformGroup : Model -> Html Msg
viewTransformGroup model =
    viewFilterGroup model
        "transform"
        "Transform"
        [ viewRotationRow model
        , viewMirrorRow model
        ]


viewToneGroup : Model -> Html Msg
viewToneGroup model =
    viewFilterGroup model
        "tone"
        "Tone"
        (viewToggleRows
            [ ( "Grayscale", model.filters.grayscale, ToggleGrayscale )
            , ( "Invert", model.filters.invert, ToggleInvert )
            ]
            ++ List.map viewToggleRangeRow (toneToggleRanges model)
        )


viewColourAdjustGroup : Model -> Html Msg
viewColourAdjustGroup model =
    viewFilterGroup model
        "colour-adjust"
        "Colour Adjust"
        (List.map viewToggleRangeRow (colourAdjustToggleRanges model))


viewAdvancedColourAdjustGroup : Model -> Html Msg
viewAdvancedColourAdjustGroup model =
    viewFilterGroup model
        "advanced-colour-adjust"
        "Advanced colour adjust"
        [ viewFilterRow
            [ button
                [ classList [ ( "filter-reset", True ) ]
                , type_ "button"
                , onClick UserResetAltColourAdjust
                ]
                [ text "Reset sliders" ]
            ]
        , viewToggleRangeRow
            { label = "Red Gamma"
            , checked = model.filters.altRedGammaEnabled
            , onToggle = ToggleAltRedGamma
            , min = "0"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altRedGamma
            , display = String.fromInt model.filters.altRedGamma
            , onInput = UserUpdatedFilterInt IntAltRedGamma
            }
        , viewToggleRangeRow
            { label = "Red Sigmoid"
            , checked = model.filters.altRedSigmoidEnabled
            , onToggle = ToggleAltRedSigmoid
            , min = "0"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altRedSigmoid
            , display = String.fromInt model.filters.altRedSigmoid
            , onInput = UserUpdatedFilterInt IntAltRedSigmoid
            }
        , viewToggleRangeRow
            { label = "Red Hue Boost"
            , checked = model.filters.altRedHueEnabled
            , onToggle = ToggleAltRedHue
            , min = "-100"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altRedHue
            , display = String.fromInt model.filters.altRedHue
            , onInput = UserUpdatedFilterInt IntAltRedHue
            }
        , viewRangeRow
            { label = "Red Hue Window"
            , min = "2"
            , max = "30"
            , step = Just "1"
            , value = String.fromInt model.filters.altRedHueWindow
            , display = String.fromInt model.filters.altRedHueWindow
            , onInput = UserUpdatedFilterInt IntAltRedHueWindow
            }
        , viewToggleRangeRow
            { label = "Red Vibrance"
            , checked = model.filters.altRedVibranceEnabled
            , onToggle = ToggleAltRedVibrance
            , min = "0"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altRedVibrance
            , display = String.fromInt model.filters.altRedVibrance
            , onInput = UserUpdatedFilterInt IntAltRedVibrance
            }
        , viewToggleRangeRow
            { label = "Green Gamma"
            , checked = model.filters.altGreenGammaEnabled
            , onToggle = ToggleAltGreenGamma
            , min = "0"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altGreenGamma
            , display = String.fromInt model.filters.altGreenGamma
            , onInput = UserUpdatedFilterInt IntAltGreenGamma
            }
        , viewToggleRangeRow
            { label = "Green Sigmoid"
            , checked = model.filters.altGreenSigmoidEnabled
            , onToggle = ToggleAltGreenSigmoid
            , min = "0"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altGreenSigmoid
            , display = String.fromInt model.filters.altGreenSigmoid
            , onInput = UserUpdatedFilterInt IntAltGreenSigmoid
            }
        , viewToggleRangeRow
            { label = "Green Hue Boost"
            , checked = model.filters.altGreenHueEnabled
            , onToggle = ToggleAltGreenHue
            , min = "-100"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altGreenHue
            , display = String.fromInt model.filters.altGreenHue
            , onInput = UserUpdatedFilterInt IntAltGreenHue
            }
        , viewRangeRow
            { label = "Green Hue Window"
            , min = "2"
            , max = "30"
            , step = Just "1"
            , value = String.fromInt model.filters.altGreenHueWindow
            , display = String.fromInt model.filters.altGreenHueWindow
            , onInput = UserUpdatedFilterInt IntAltGreenHueWindow
            }
        , viewToggleRangeRow
            { label = "Green Vibrance"
            , checked = model.filters.altGreenVibranceEnabled
            , onToggle = ToggleAltGreenVibrance
            , min = "0"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altGreenVibrance
            , display = String.fromInt model.filters.altGreenVibrance
            , onInput = UserUpdatedFilterInt IntAltGreenVibrance
            }
        , viewToggleRangeRow
            { label = "Blue Gamma"
            , checked = model.filters.altBlueGammaEnabled
            , onToggle = ToggleAltBlueGamma
            , min = "0"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altBlueGamma
            , display = String.fromInt model.filters.altBlueGamma
            , onInput = UserUpdatedFilterInt IntAltBlueGamma
            }
        , viewToggleRangeRow
            { label = "Blue Sigmoid"
            , checked = model.filters.altBlueSigmoidEnabled
            , onToggle = ToggleAltBlueSigmoid
            , min = "0"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altBlueSigmoid
            , display = String.fromInt model.filters.altBlueSigmoid
            , onInput = UserUpdatedFilterInt IntAltBlueSigmoid
            }
        , viewToggleRangeRow
            { label = "Blue Hue Boost"
            , checked = model.filters.altBlueHueEnabled
            , onToggle = ToggleAltBlueHue
            , min = "-100"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altBlueHue
            , display = String.fromInt model.filters.altBlueHue
            , onInput = UserUpdatedFilterInt IntAltBlueHue
            }
        , viewRangeRow
            { label = "Blue Hue Window"
            , min = "2"
            , max = "30"
            , step = Just "1"
            , value = String.fromInt model.filters.altBlueHueWindow
            , display = String.fromInt model.filters.altBlueHueWindow
            , onInput = UserUpdatedFilterInt IntAltBlueHueWindow
            }
        , viewToggleRangeRow
            { label = "Blue Vibrance"
            , checked = model.filters.altBlueVibranceEnabled
            , onToggle = ToggleAltBlueVibrance
            , min = "0"
            , max = "100"
            , step = Just "1"
            , value = String.fromInt model.filters.altBlueVibrance
            , display = String.fromInt model.filters.altBlueVibrance
            , onInput = UserUpdatedFilterInt IntAltBlueVibrance
            }
        ]


viewMorphologyGroup : Model -> Html Msg
viewMorphologyGroup model =
    viewFilterGroup model
        "morphology"
        "Morphology"
        [ viewFilterRow
            [ viewToggle "Morph" model.filters.morphEnabled ToggleMorph
            , viewSelect model.filters.morphOperation (UserUpdatedFilterString StringMorphOperation) morphOperationOptions
            , viewSelect (String.fromInt model.filters.morphKernel) (UserUpdatedFilterInt IntMorphKernel) morphKernelOptions
            ]
        ]


viewConvolutionGroup : Model -> Html Msg
viewConvolutionGroup model =
    viewFilterGroup model
        "convolution"
        "Convolution"
        [ viewFilterRow
            [ viewToggle "Kernel" model.filters.convolutionEnabled ToggleConvolution
            , viewSelect model.filters.convolutionPreset (UserUpdatedFilterString StringConvolutionPreset) convolutionPresets
            ]
        ]


viewColourmapGroup : Model -> Html Msg
viewColourmapGroup model =
    viewFilterGroup model
        "colourmap"
        "Colourmap"
        [ viewFilterRow
            [ viewToggle "Colourmap" model.filters.colourmapEnabled ToggleColourmap
            , viewSelect model.filters.colourmapPreset (UserUpdatedFilterString StringColourmapPreset) colourmapPresets
            ]
        , viewRangeRow
            { label = "Center"
            , min = "0"
            , max = "255"
            , step = Nothing
            , value = String.fromInt model.filters.colourmapCenter
            , display = String.fromInt model.filters.colourmapCenter
            , onInput = UserUpdatedFilterInt IntColourmapCenter
            }
        ]


viewPseudoColourGroup : Model -> Html Msg
viewPseudoColourGroup model =
    viewFilterGroup model
        "pseudo-colour"
        "Pseudo Colour"
        [ viewFilterRow
            [ viewToggle "Pseudo-colour" model.filters.pseudoColourEnabled TogglePseudoColour
            , viewSelect model.filters.pseudoColourMode (UserUpdatedFilterString StringPseudoColourMode) pseudoColourModes
            ]
        , viewRangeRow
            { label = "Red Weight"
            , min = "0"
            , max = "2"
            , step = Just "0.01"
            , value = String.fromFloat model.filters.pseudoColourRed
            , display = String.fromFloat model.filters.pseudoColourRed
            , onInput = UserUpdatedFilterFloat FloatPseudoColourRed
            }
        , viewRangeRow
            { label = "Green Weight"
            , min = "0"
            , max = "2"
            , step = Just "0.01"
            , value = String.fromFloat model.filters.pseudoColourGreen
            , display = String.fromFloat model.filters.pseudoColourGreen
            , onInput = UserUpdatedFilterFloat FloatPseudoColourGreen
            }
        , viewRangeRow
            { label = "Blue Weight"
            , min = "0"
            , max = "2"
            , step = Just "0.01"
            , value = String.fromFloat model.filters.pseudoColourBlue
            , display = String.fromFloat model.filters.pseudoColourBlue
            , onInput = UserUpdatedFilterFloat FloatPseudoColourBlue
            }
        , viewFilterRow
            [ viewToggle "Replace Colour" model.filters.colourReplaceEnabled ToggleColourReplace ]
        , viewFilterRow
            [ span [ classList [ ( "filter-label", True ) ] ] [ text "Source" ]
            , viewColourInput model.filters.colourReplaceSource (UserUpdatedFilterString StringColourReplaceSource)
            , span [ classList [ ( "filter-label", True ) ] ] [ text "Target" ]
            , viewColourInput model.filters.colourReplaceTarget (UserUpdatedFilterString StringColourReplaceTarget)
            ]
        , viewRangeRow
            { label = "Tolerance"
            , min = "0"
            , max = "255"
            , step = Just "1"
            , value = String.fromInt model.filters.colourReplaceTolerance
            , display = String.fromInt model.filters.colourReplaceTolerance
            , onInput = UserUpdatedFilterInt IntColourReplaceTolerance
            }
        , viewRangeRow
            { label = "Strength"
            , min = "0"
            , max = "1"
            , step = Just "0.01"
            , value = String.fromFloat model.filters.colourReplaceBlend
            , display = String.fromFloat model.filters.colourReplaceBlend
            , onInput = UserUpdatedFilterFloat FloatColourReplaceBlend
            }
        , viewFilterRow
            [ viewToggle "Preserve Luminance" model.filters.colourReplacePreserveLum ToggleColourReplacePreserveLum ]
        ]


viewPcaGroup : Model -> Html Msg
viewPcaGroup model =
    viewFilterGroup model
        "pca"
        "Principle Component Analysis"
        [ viewFilterRow
            [ viewToggle "PCA" model.filters.pcaEnabled TogglePca
            , viewSelect model.filters.pcaMode (UserUpdatedFilterString StringPcaMode) pcaModes
            ]
        ]


viewEnhancementGroup : Model -> Html Msg
viewEnhancementGroup model =
    viewFilterGroup model
        "enhancement"
        "Enhancement"
        (List.map viewToggleRangeRow (enhancementToggleRanges model)
            ++ [ viewRangeRow (adaptiveOffsetRange model) ]
        )


viewFilterJsonGroup : Model -> Html Msg
viewFilterJsonGroup model =
    viewFilterGroup model
        "filter-json"
        "Import / Export Filter Settings"
        [ viewFilterRow
            [ button
                [ classList [ ( "filter-reset", True ) ]
                , type_ "button"
                , onClick UserCopiedFilterJson
                ]
                [ text "Show JSON" ]
            , button
                [ classList [ ( "filter-reset", True ) ]
                , type_ "button"
                , onClick UserAppliedFilterJson
                ]
                [ text "Apply" ]
            ]
        , textarea
            [ classList [ ( "filter-json", True ) ]
            , value model.filtersJsonInput
            , onInput UserUpdatedFilterJsonInput
            , rows 6
            ]
            []
        , case model.filtersJsonError of
            Just err ->
                div [ classList [ ( "filter-json-error", True ) ] ] [ text err ]

            Nothing ->
                text ""
        ]


viewRotationRow : Model -> Html Msg
viewRotationRow model =
    div [ classList [ ( "filter-range-group", True ) ] ]
        [ div [ classList [ ( "filter-range-header", True ) ] ]
            [ span [ classList [ ( "filter-label", True ) ] ] [ text "Rotation" ]
            , span [ classList [ ( "filter-range-header-right", True ) ] ]
                [ span [ classList [ ( "filter-value", True ) ] ]
                    [ text (String.fromInt model.filters.rotation ++ "°") ]
                , button
                    [ classList [ ( "filter-reset", True ) ]
                    , type_ "button"
                    , onClick (UserUpdatedFilterInt IntRotation "0")
                    ]
                    [ text "Reset" ]
                ]
            ]
        , viewRangeInput "-180"
            "180"
            (Just "1")
            (String.fromInt model.filters.rotation)
            (UserUpdatedFilterInt IntRotation)
        ]


viewMirrorRow : Model -> Html Msg
viewMirrorRow model =
    viewFilterRow
        [ viewToggle "Mirror" model.filters.flip ToggleFlip ]


viewToggleRows : List ( String, Bool, FilterToggle ) -> List (Html Msg)
viewToggleRows items =
    List.map
        (\( labelText, isChecked, toggle ) ->
            viewToggle labelText isChecked toggle
        )
        items


toneToggleRanges : Model -> List ToggleRangeRowConfig
toneToggleRanges model =
    [ { label = "Threshold"
      , checked = model.filters.thresholdEnabled
      , onToggle = ToggleThreshold
      , min = "0"
      , max = "255"
      , step = Nothing
      , value = String.fromInt model.filters.threshold
      , display = String.fromInt model.filters.threshold
      , onInput = UserUpdatedFilterInt IntThreshold
      }
    ]


colourAdjustToggleRanges : Model -> List ToggleRangeRowConfig
colourAdjustToggleRanges model =
    [ { label = "Brightness"
      , checked = model.filters.brightnessEnabled
      , onToggle = ToggleBrightness
      , min = "-255"
      , max = "255"
      , step = Nothing
      , value = String.fromInt model.filters.brightness
      , display = String.fromInt model.filters.brightness
      , onInput = UserUpdatedFilterInt IntBrightness
      }
    , { label = "Contrast"
      , checked = model.filters.contrastEnabled
      , onToggle = ToggleContrast
      , min = "0"
      , max = "4"
      , step = Just "0.1"
      , value = String.fromFloat model.filters.contrast
      , display = String.fromFloat model.filters.contrast
      , onInput = UserUpdatedFilterFloat FloatContrast
      }
    , { label = "Gamma"
      , checked = model.filters.gammaEnabled
      , onToggle = ToggleGamma
      , min = "0.1"
      , max = "4"
      , step = Just "0.1"
      , value = String.fromFloat model.filters.gamma
      , display = String.fromFloat model.filters.gamma
      , onInput = UserUpdatedFilterFloat FloatGamma
      }
    , { label = "Saturation"
      , checked = model.filters.saturationEnabled
      , onToggle = ToggleSaturation
      , min = "-100"
      , max = "100"
      , step = Nothing
      , value = String.fromInt model.filters.saturation
      , display = String.fromInt model.filters.saturation
      , onInput = UserUpdatedFilterInt IntSaturation
      }
    , { label = "Vibrance"
      , checked = model.filters.vibranceEnabled
      , onToggle = ToggleVibrance
      , min = "-100"
      , max = "100"
      , step = Nothing
      , value = String.fromInt model.filters.vibrance
      , display = String.fromInt model.filters.vibrance
      , onInput = UserUpdatedFilterInt IntVibrance
      }
    , { label = "Hue"
      , checked = model.filters.hueEnabled
      , onToggle = ToggleHue
      , min = "-100"
      , max = "100"
      , step = Nothing
      , value = String.fromInt model.filters.hue
      , display = String.fromInt model.filters.hue
      , onInput = UserUpdatedFilterInt IntHue
      }
    , { label = "Red"
      , checked = model.filters.ccRedEnabled
      , onToggle = ToggleCcRed
      , min = "-100"
      , max = "100"
      , step = Nothing
      , value = String.fromInt model.filters.ccRed
      , display = String.fromInt model.filters.ccRed
      , onInput = UserUpdatedFilterInt IntCcRed
      }
    , { label = "Green"
      , checked = model.filters.ccGreenEnabled
      , onToggle = ToggleCcGreen
      , min = "-100"
      , max = "100"
      , step = Nothing
      , value = String.fromInt model.filters.ccGreen
      , display = String.fromInt model.filters.ccGreen
      , onInput = UserUpdatedFilterInt IntCcGreen
      }
    , { label = "Blue"
      , checked = model.filters.ccBlueEnabled
      , onToggle = ToggleCcBlue
      , min = "-100"
      , max = "100"
      , step = Nothing
      , value = String.fromInt model.filters.ccBlue
      , display = String.fromInt model.filters.ccBlue
      , onInput = UserUpdatedFilterInt IntCcBlue
      }
    ]


enhancementToggleRanges : Model -> List ToggleRangeRowConfig
enhancementToggleRanges model =
    [ { label = "Normalize"
      , checked = model.filters.normalizeEnabled
      , onToggle = ToggleNormalize
      , min = "0"
      , max = "2"
      , step = Just "0.1"
      , value = String.fromFloat model.filters.normalizeStrength
      , display = String.fromFloat model.filters.normalizeStrength
      , onInput = UserUpdatedFilterFloat FloatNormalizeStrength
      }
    , { label = "Unsharp"
      , checked = model.filters.unsharpEnabled
      , onToggle = ToggleUnsharp
      , min = "0"
      , max = "3"
      , step = Just "0.1"
      , value = String.fromFloat model.filters.unsharpAmount
      , display = String.fromFloat model.filters.unsharpAmount
      , onInput = UserUpdatedFilterFloat FloatUnsharpAmount
      }
    , { label = "Adaptive"
      , checked = model.filters.adaptiveEnabled
      , onToggle = ToggleAdaptive
      , min = "3"
      , max = "51"
      , step = Just "2"
      , value = String.fromInt model.filters.adaptiveWindow
      , display = String.fromInt model.filters.adaptiveWindow
      , onInput = UserUpdatedFilterInt IntAdaptiveWindow
      }
    ]


adaptiveOffsetRange : Model -> RangeRowConfig
adaptiveOffsetRange model =
    { label = "Offset"
    , min = "-50"
    , max = "50"
    , step = Just "1"
    , value = String.fromInt model.filters.adaptiveOffset
    , display = String.fromInt model.filters.adaptiveOffset
    , onInput = UserUpdatedFilterInt IntAdaptiveOffset
    }


morphOperationOptions : List (Html Msg)
morphOperationOptions =
    [ option [ value "erode" ] [ text "Erode" ]
    , option [ value "dilate" ] [ text "Dilate" ]
    ]


morphKernelOptions : List (Html Msg)
morphKernelOptions =
    [ option [ value "3" ] [ text "3x3" ]
    , option [ value "5" ] [ text "5x5" ]
    , option [ value "7" ] [ text "7x7" ]
    ]


convolutionPresets : List (Html Msg)
convolutionPresets =
    [ option [ value "sharpen" ] [ text "Sharpen" ]
    , option [ value "blur" ] [ text "Blur" ]
    , option [ value "edge" ] [ text "Edge" ]
    , option [ value "emboss" ] [ text "Emboss" ]
    ]


colourmapPresets : List (Html Msg)
colourmapPresets =
    [ option [ value "gray" ] [ text "Gray" ]
    , option [ value "hot" ] [ text "Hot" ]
    , option [ value "cool" ] [ text "Cool" ]
    ]


pseudoColourModes : List (Html Msg)
pseudoColourModes =
    [ option [ value "rg" ] [ text "Red–Green Diff" ]
    , option [ value "gb" ] [ text "Green–Blue Diff" ]
    , option [ value "rb" ] [ text "Red–Blue Diff" ]
    , option [ value "luma" ] [ text "Luma False Colour" ]
    , option [ value "cmy" ] [ text "CMY False Colour" ]
    , option [ value "heat" ] [ text "Heat Map" ]
    ]


pcaModes : List (Html Msg)
pcaModes =
    [ option [ value "pca-rgb" ] [ text "PCA (RGB)" ]
    , option [ value "pca1" ] [ text "PCA Component 1" ]
    , option [ value "pca2" ] [ text "PCA Component 2" ]
    , option [ value "pca3" ] [ text "PCA Component 3" ]
    ]


viewFilterGroup : Model -> String -> String -> List (Html Msg) -> Html Msg
viewFilterGroup model groupId title items =
    let
        isExpanded =
            Set.member groupId model.filterGroupExpanded
    in
    div [ classList [ ( "filter-group", True ) ] ]
        (button
            [ classList
                [ ( "filter-title-button", True )
                , ( "is-collapsed", not isExpanded )
                ]
            , onClick (UserToggledFilterGroup groupId)
            ]
            [ span
                [ classList
                    [ ( "filter-title-icon", True )
                    , ( "is-expanded", isExpanded )
                    ]
                ]
                []
            , span [] [ text title ]
            ]
            :: (if isExpanded then
                    items

                else
                    []
               )
        )


viewFilterRow : List (Html Msg) -> Html Msg
viewFilterRow items =
    div [ classList [ ( "filter-row", True ) ] ] items


viewToggle : String -> Bool -> FilterToggle -> Html Msg
viewToggle labelText isChecked toggle =
    label [ classList [ ( "filter-toggle", True ) ] ]
        [ input
            [ type_ "checkbox"
            , checked isChecked
            , onCheck (UserToggledFilter toggle)
            ]
            []
        , text labelText
        ]


viewRangeRow : RangeRowConfig -> Html Msg
viewRangeRow config =
    div [ classList [ ( "filter-range-group", True ) ] ]
        [ div [ classList [ ( "filter-range-header", True ) ] ]
            [ span [ classList [ ( "filter-label", True ) ] ] [ text config.label ]
            , span [ classList [ ( "filter-value", True ) ] ] [ text config.display ]
            ]
        , viewRangeInput config.min config.max config.step config.value config.onInput
        ]


viewToggleRangeRow : ToggleRangeRowConfig -> Html Msg
viewToggleRangeRow config =
    div [ classList [ ( "filter-range-group", True ) ] ]
        [ div [ classList [ ( "filter-range-header", True ) ] ]
            [ label [ classList [ ( "filter-toggle", True ), ( "is-inline", True ) ] ]
                [ input
                    [ type_ "checkbox"
                    , checked config.checked
                    , onCheck (UserToggledFilter config.onToggle)
                    ]
                    []
                , text config.label
                ]
            , span [ classList [ ( "filter-value", True ) ] ] [ text config.display ]
            ]
        , viewRangeInput config.min config.max config.step config.value config.onInput
        ]


viewRangeInput : String -> String -> Maybe String -> String -> (String -> Msg) -> Html Msg
viewRangeInput minValue maxValue stepValue currentValue onChange =
    let
        baseAttrs =
            [ type_ "range"
            , Attr.min minValue
            , Attr.max maxValue
            , value currentValue
            , onInput onChange
            ]

        attrs =
            case stepValue of
                Just stepSize ->
                    Attr.step stepSize :: baseAttrs

                Nothing ->
                    baseAttrs
    in
    input (classList [ ( "filter-range-input", True ) ] :: attrs) []


viewColourInput : String -> (String -> Msg) -> Html Msg
viewColourInput colourValue onChange =
    input
        [ classList [ ( "filter-color-input", True ) ]
        , type_ "color"
        , value colourValue
        , onInput onChange
        ]
        []


viewSelect : String -> (String -> Msg) -> List (Html Msg) -> Html Msg
viewSelect currentValue onChange options =
    select
        [ classList [ ( "filter-select", True ) ]
        , onInput onChange
        , value currentValue
        ]
        options


viewImageChoicesSidebar : List PageImage -> Int -> Html Msg
viewImageChoicesSidebar images selectedIndex =
    div
        [ classList [ ( "page-view-choices", True ) ] ]
        (List.indexedMap (\index image -> Lazy.lazy3 viewImageChoiceItem selectedIndex index image) images)


viewImageChoiceItem : Int -> Int -> PageImage -> Html Msg
viewImageChoiceItem selectedIndex index image =
    let
        isActive =
            index == selectedIndex

    in
    button
        [ classList
            [ ( "page-view-choice", True )
            , ( "ui-card", True )
            , ( "ui-card--dark", True )
            , ( "is-active", isActive )
            ]
        , type_ "button"
        , onClick (UserClickedPageViewImageChoice index)
        ]
        [ img
            [ classList [ ( "page-view-choice-thumb", True ) ]
            , src image.thumbUrl
            , alt image.label
            ]
            []
        , span
            [ classList [ ( "page-view-choice-label", True ) ] ]
            [ text image.label ]
        ]
