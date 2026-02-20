module View.PageViewModal exposing (viewPageViewModal)

import Filters exposing (FilterFloatValue(..), FilterIntValue(..), FilterStringValue(..), FilterToggle(..))
import Html exposing (Html, button, div, img, input, label, option, select, span, text, textarea)
import Html.Attributes as HA exposing (alt, checked, classList, id, rows, src, type_, value)
import Html.Events exposing (onCheck, onClick, onInput)
import Html.Lazy as Lazy
import IIIF.Language exposing (extractLabelFromLanguageMap)
import IIIF.Presentation exposing (toLabel)
import Model exposing (Model, PageImage, currentManifest, getPageAt)
import Msg exposing (Msg(..))
import Set
import Utilities exposing (disabledIf)
import View.Helpers exposing (emptyHtml, viewButton)
import View.Icons as Icons


viewPageViewModal : Model -> Html Msg
viewPageViewModal model =
    if model.pageViewOpen then
        div
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

    else
        emptyHtml


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


blueChannelConfig : Model -> ChannelConfig
blueChannelConfig model =
    { gammaEnabled = model.filters.altBlueGammaEnabled
    , gamma = model.filters.altBlueGamma
    , gammaToggle = ToggleAltBlueGamma
    , gammaInput = IntAltBlueGamma
    , sigmoidEnabled = model.filters.altBlueSigmoidEnabled
    , sigmoid = model.filters.altBlueSigmoid
    , sigmoidToggle = ToggleAltBlueSigmoid
    , sigmoidInput = IntAltBlueSigmoid
    , hueEnabled = model.filters.altBlueHueEnabled
    , hue = model.filters.altBlueHue
    , hueToggle = ToggleAltBlueHue
    , hueInput = IntAltBlueHue
    , hueWindow = model.filters.altBlueHueWindow
    , hueWindowInput = IntAltBlueHueWindow
    , vibranceEnabled = model.filters.altBlueVibranceEnabled
    , vibrance = model.filters.altBlueVibrance
    , vibranceToggle = ToggleAltBlueVibrance
    , vibranceInput = IntAltBlueVibrance
    }


type alias ChannelConfig =
    { gammaEnabled : Bool
    , gamma : Int
    , gammaToggle : FilterToggle
    , gammaInput : FilterIntValue
    , sigmoidEnabled : Bool
    , sigmoid : Int
    , sigmoidToggle : FilterToggle
    , sigmoidInput : FilterIntValue
    , hueEnabled : Bool
    , hue : Int
    , hueToggle : FilterToggle
    , hueInput : FilterIntValue
    , hueWindow : Int
    , hueWindowInput : FilterIntValue
    , vibranceEnabled : Bool
    , vibrance : Int
    , vibranceToggle : FilterToggle
    , vibranceInput : FilterIntValue
    }


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


colourmapPresets : List (Html Msg)
colourmapPresets =
    [ option [ value "gray" ] [ text "Gray" ]
    , option [ value "hot" ] [ text "Hot" ]
    , option [ value "cool" ] [ text "Cool" ]
    ]


convolutionPresets : List (Html Msg)
convolutionPresets =
    [ option [ value "sharpen" ] [ text "Sharpen" ]
    , option [ value "blur" ] [ text "Blur" ]
    , option [ value "edge" ] [ text "Edge" ]
    , option [ value "emboss" ] [ text "Emboss" ]
    ]


currentPageLabelFor : Model -> String
currentPageLabelFor model =
    model.selectedIndex
        |> Maybe.andThen (\index -> getPageAt index model.pages)
        |> Maybe.map .label
        |> Maybe.withDefault ""


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
    , { label = "Adaptive Threshold"
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


greenChannelConfig : Model -> ChannelConfig
greenChannelConfig model =
    { gammaEnabled = model.filters.altGreenGammaEnabled
    , gamma = model.filters.altGreenGamma
    , gammaToggle = ToggleAltGreenGamma
    , gammaInput = IntAltGreenGamma
    , sigmoidEnabled = model.filters.altGreenSigmoidEnabled
    , sigmoid = model.filters.altGreenSigmoid
    , sigmoidToggle = ToggleAltGreenSigmoid
    , sigmoidInput = IntAltGreenSigmoid
    , hueEnabled = model.filters.altGreenHueEnabled
    , hue = model.filters.altGreenHue
    , hueToggle = ToggleAltGreenHue
    , hueInput = IntAltGreenHue
    , hueWindow = model.filters.altGreenHueWindow
    , hueWindowInput = IntAltGreenHueWindow
    , vibranceEnabled = model.filters.altGreenVibranceEnabled
    , vibrance = model.filters.altGreenVibrance
    , vibranceToggle = ToggleAltGreenVibrance
    , vibranceInput = IntAltGreenVibrance
    }


manifestTitleFor : Model -> String
manifestTitleFor model =
    currentManifest model
        |> Maybe.map (\m -> toLabel m |> extractLabelFromLanguageMap model.detectedLanguage)
        |> Maybe.withDefault ""


morphKernelOptions : List (Html Msg)
morphKernelOptions =
    [ option [ value "3" ] [ text "3x3" ]
    , option [ value "5" ] [ text "5x5" ]
    , option [ value "7" ] [ text "7x7" ]
    ]


morphOperationOptions : List (Html Msg)
morphOperationOptions =
    [ option [ value "erode" ] [ text "Erode" ]
    , option [ value "dilate" ] [ text "Dilate" ]
    ]


pcaModes : List (Html Msg)
pcaModes =
    [ option [ value "pca-rgb" ] [ text "PCA (RGB)" ]
    , option [ value "pca1" ] [ text "PCA Component 1" ]
    , option [ value "pca2" ] [ text "PCA Component 2" ]
    , option [ value "pca3" ] [ text "PCA Component 3" ]
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


type alias RangeRowConfig =
    { label : String
    , min : String
    , max : String
    , step : Maybe String
    , value : String
    , display : String
    , onInput : String -> Msg
    }


redChannelConfig : Model -> ChannelConfig
redChannelConfig model =
    { gammaEnabled = model.filters.altRedGammaEnabled
    , gamma = model.filters.altRedGamma
    , gammaToggle = ToggleAltRedGamma
    , gammaInput = IntAltRedGamma
    , sigmoidEnabled = model.filters.altRedSigmoidEnabled
    , sigmoid = model.filters.altRedSigmoid
    , sigmoidToggle = ToggleAltRedSigmoid
    , sigmoidInput = IntAltRedSigmoid
    , hueEnabled = model.filters.altRedHueEnabled
    , hue = model.filters.altRedHue
    , hueToggle = ToggleAltRedHue
    , hueInput = IntAltRedHue
    , hueWindow = model.filters.altRedHueWindow
    , hueWindowInput = IntAltRedHueWindow
    , vibranceEnabled = model.filters.altRedVibranceEnabled
    , vibrance = model.filters.altRedVibrance
    , vibranceToggle = ToggleAltRedVibrance
    , vibranceInput = IntAltRedVibrance
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


viewAdvancedColourAdjustGroup : Model -> Html Msg
viewAdvancedColourAdjustGroup model =
    viewFilterGroup model
        "advanced-colour-adjust"
        "Advanced colour adjust"
        (viewFilterRow
            [ button
                [ HA.class "filter-reset"
                , type_ "button"
                , onClick UserResetAltColourAdjust
                ]
                [ text "Reset sliders" ]
            ]
            :: viewChannelRows "Red" (redChannelConfig model)
            ++ viewChannelRows "Green" (greenChannelConfig model)
            ++ viewChannelRows "Blue" (blueChannelConfig model)
        )


viewChannelRows : String -> ChannelConfig -> List (Html Msg)
viewChannelRows channelName config =
    [ viewToggleRangeRow
        { label = channelName ++ " Gamma"
        , checked = config.gammaEnabled
        , onToggle = config.gammaToggle
        , min = "0"
        , max = "100"
        , step = Just "1"
        , value = String.fromInt config.gamma
        , display = String.fromInt config.gamma
        , onInput = UserUpdatedFilterInt config.gammaInput
        }
    , viewToggleRangeRow
        { label = channelName ++ " Sigmoid"
        , checked = config.sigmoidEnabled
        , onToggle = config.sigmoidToggle
        , min = "0"
        , max = "100"
        , step = Just "1"
        , value = String.fromInt config.sigmoid
        , display = String.fromInt config.sigmoid
        , onInput = UserUpdatedFilterInt config.sigmoidInput
        }
    , viewToggleRangeRow
        { label = channelName ++ " Hue Boost"
        , checked = config.hueEnabled
        , onToggle = config.hueToggle
        , min = "-100"
        , max = "100"
        , step = Just "1"
        , value = String.fromInt config.hue
        , display = String.fromInt config.hue
        , onInput = UserUpdatedFilterInt config.hueInput
        }
    , viewRangeRow
        { label = channelName ++ " Hue Window"
        , min = "2"
        , max = "30"
        , step = Just "1"
        , value = String.fromInt config.hueWindow
        , display = String.fromInt config.hueWindow
        , onInput = UserUpdatedFilterInt config.hueWindowInput
        }
    , viewToggleRangeRow
        { label = channelName ++ " Vibrance"
        , checked = config.vibranceEnabled
        , onToggle = config.vibranceToggle
        , min = "0"
        , max = "100"
        , step = Just "1"
        , value = String.fromInt config.vibrance
        , display = String.fromInt config.vibrance
        , onInput = UserUpdatedFilterInt config.vibranceInput
        }
    ]


viewColourAdjustGroup : Model -> Html Msg
viewColourAdjustGroup model =
    viewFilterGroup model
        "colour-adjust"
        "Colour Adjust"
        (List.map viewToggleRangeRow (colourAdjustToggleRanges model))


viewColourInput : String -> (String -> Msg) -> Html Msg
viewColourInput colourValue onChange =
    input
        [ HA.class "filter-color-input"
        , type_ "color"
        , value colourValue
        , onInput onChange
        ]
        []


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


viewEnhancementGroup : Model -> Html Msg
viewEnhancementGroup model =
    viewFilterGroup model
        "enhancement"
        "Enhancement"
        (List.map viewToggleRangeRow (enhancementToggleRanges model)
            ++ [ viewRangeRow (adaptiveOffsetRange model) ]
        )


viewFilterGroup : Model -> String -> String -> List (Html Msg) -> Html Msg
viewFilterGroup model groupId title items =
    let
        isExpanded =
            Set.member groupId model.filterGroupExpanded
    in
    div [ HA.class "filter-group" ]
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


viewFilterJsonGroup : Model -> Html Msg
viewFilterJsonGroup model =
    viewFilterGroup model
        "filter-json"
        "Import / Export Filter Settings"
        [ viewFilterRow
            [ button
                [ HA.class "filter-reset"
                , type_ "button"
                , onClick UserCopiedFilterJson
                ]
                [ text "Show JSON" ]
            , button
                [ HA.class "filter-reset"
                , type_ "button"
                , onClick UserAppliedFilterJson
                ]
                [ text "Apply" ]
            ]
        , textarea
            [ HA.class "filter-json"
            , value model.filtersJsonInput
            , onInput UserUpdatedFilterJsonInput
            , rows 6
            ]
            []
        , case model.filtersJsonError of
            Just err ->
                div [ HA.class "filter-json-error" ] [ text err ]

            Nothing ->
                emptyHtml
        ]


viewFilterRow : List (Html Msg) -> Html Msg
viewFilterRow items =
    div [ HA.class "filter-row" ] items


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
            [ HA.class "page-view-choice-thumb"
            , src image.thumbUrl
            , alt image.label
            ]
            []
        , span
            [ HA.class "page-view-choice-label" ]
            [ text image.label ]
        ]


viewImageChoicesSidebar : List PageImage -> Int -> Html Msg
viewImageChoicesSidebar images selectedIndex =
    div
        [ HA.class "page-view-choices" ]
        (List.indexedMap (\index image -> Lazy.lazy3 viewImageChoiceItem selectedIndex index image) images)


viewMirrorRow : Model -> Html Msg
viewMirrorRow model =
    viewFilterRow
        [ viewToggle "Mirror" model.filters.flip ToggleFlip ]


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
        [ HA.class "modal-header" ]
        [ div
            [ HA.class "modal-title-stack" ]
            (div [ HA.class "modal-title" ] [ text "Page View" ]
                :: (if String.isEmpty manifestTitle then
                        []

                    else
                        [ div [ HA.class "modal-subtitle" ] [ text manifestTitle ] ]
                   )
                ++ (if String.isEmpty pageLabel then
                        []

                    else
                        [ div [ HA.class "modal-subtitle is-muted" ] [ text pageLabel ] ]
                   )
            )
        , div
            [ HA.class "modal-actions" ]
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
                { label = "Reset Filters"
                , icon = Icons.reset
                , onClickMsg = Just UserResetAllFilters
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
            , div
                [ HA.class "modal-close-action" ]
                [ viewButton
                    { label = ""
                    , icon = Icons.close
                    , onClickMsg = Just UserClickedClosePageView
                    , isFullscreen = model.fullscreen
                    }
                ]
            ]
        ]


viewModalSidebar : Model -> Html Msg
viewModalSidebar model =
    div
        [ HA.class "modal-sidebar" ]
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
            [ HA.class "modal-canvas"
            , id "filter-viewer"
            ]
            []
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


viewPcaGroup : Model -> Html Msg
viewPcaGroup model =
    viewFilterGroup model
        "pca"
        "Visible area PCA"
        [ viewFilterRow
            [ viewToggle "Visible area PCA" model.filters.globalPcaEnabled ToggleGlobalPca
            , viewSelect model.filters.pcaMode (UserUpdatedFilterString StringPcaMode) pcaModes
            ]
        , viewRangeRow
            { label = "Hue Rotation"
            , min = "-180"
            , max = "180"
            , step = Just "1"
            , value = String.fromInt model.filters.pcaHue
            , display = String.fromInt model.filters.pcaHue ++ "deg"
            , onInput = UserUpdatedFilterInt IntPcaHue
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
            [ span [ HA.class "filter-label" ] [ text "Source" ]
            , viewColourInput model.filters.colourReplaceSource (UserUpdatedFilterString StringColourReplaceSource)
            , span [ HA.class "filter-label" ] [ text "Target" ]
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


viewRangeInput : String -> String -> Maybe String -> String -> (String -> Msg) -> Html Msg
viewRangeInput minValue maxValue stepValue currentValue onChange =
    let
        baseAttrs =
            [ type_ "range"
            , HA.min minValue
            , HA.max maxValue
            , value currentValue
            , onInput onChange
            ]

        attrs =
            case stepValue of
                Just stepSize ->
                    HA.step stepSize :: baseAttrs

                Nothing ->
                    baseAttrs
    in
    input (HA.class "filter-range-input" :: attrs) []


viewRangeRow : RangeRowConfig -> Html Msg
viewRangeRow config =
    div [ HA.class "filter-range-group" ]
        [ div [ HA.class "filter-range-header" ]
            [ span [ HA.class "filter-label" ] [ text config.label ]
            , span [ HA.class "filter-value" ] [ text config.display ]
            ]
        , viewRangeInput config.min config.max config.step config.value config.onInput
        ]


viewRotationRow : Model -> Html Msg
viewRotationRow model =
    div [ HA.class "filter-range-group" ]
        [ div [ HA.class "filter-range-header" ]
            [ span [ HA.class "filter-label" ] [ text "Rotation" ]
            , span [ HA.class "filter-range-header-right" ]
                [ span [ HA.class "filter-value" ]
                    [ text (String.fromInt model.filters.rotation ++ "°") ]
                , button
                    [ HA.class "filter-reset"
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


viewSelect : String -> (String -> Msg) -> List (Html Msg) -> Html Msg
viewSelect currentValue onChange options =
    select
        [ HA.class "filter-select"
        , onInput onChange
        , value currentValue
        ]
        options


viewToggle : String -> Bool -> FilterToggle -> Html Msg
viewToggle labelText isChecked toggle =
    label [ HA.class "filter-toggle" ]
        [ input
            [ type_ "checkbox"
            , checked isChecked
            , onCheck (UserToggledFilter toggle)
            ]
            []
        , text labelText
        ]


viewToggleRangeRow : ToggleRangeRowConfig -> Html Msg
viewToggleRangeRow config =
    div [ HA.class "filter-range-group" ]
        [ div [ HA.class "filter-range-header" ]
            [ label [ HA.class "filter-toggle is-inline" ]
                [ input
                    [ type_ "checkbox"
                    , checked config.checked
                    , onCheck (UserToggledFilter config.onToggle)
                    ]
                    []
                , text config.label
                ]
            , span [ HA.class "filter-value" ] [ text config.display ]
            ]
        , viewRangeInput config.min config.max config.step config.value config.onInput
        ]


viewToggleRows : List ( String, Bool, FilterToggle ) -> List (Html Msg)
viewToggleRows items =
    List.map
        (\( labelText, isChecked, toggle ) ->
            viewToggle labelText isChecked toggle
        )
        items


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


viewTransformGroup : Model -> Html Msg
viewTransformGroup model =
    viewFilterGroup model
        "transform"
        "Transform"
        [ viewRotationRow model
        , viewMirrorRow model
        ]
