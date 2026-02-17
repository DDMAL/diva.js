module View.ManifestInfoModal exposing (viewManifestInfoModal)

import Html exposing (Html, a, div, img, text)
import Html.Attributes as HA exposing (alt, classList, href, rel, src, target)
import IIIF.Image exposing (ImageSize(..), createImageAddress, parseImageAddress, setImageUriSize)
import IIIF.Language exposing (Language(..), extractLabelFromLanguageMap)
import IIIF.Presentation exposing (Behavior(..), HomePage, IIIFManifest(..), Logo, Provider, ViewingDirection(..), ViewingHint(..), ViewingLayout(..), toCanvases, toHomepage, toLogo, toProvider, toRanges)
import IIIF.Version exposing (IIIFVersion(..))
import Model exposing (Model, ResourceResponse(..), Response(..), currentManifest)
import Msg exposing (Msg(..))
import View.Helpers exposing (emptyHtml, viewButton, viewMaybe)
import View.HtmlRenderer as HtmlRenderer
import View.Icons as Icons


viewManifestInfoModal : Model -> Html Msg
viewManifestInfoModal model =
    if model.manifestInfoOpen then
        div
            [ HA.class "modal-overlay" ]
            [ div
                [ classList
                    [ ( "modal", True )
                    , ( "is-narrow", True )
                    ]
                ]
                [ viewHeader model
                , currentManifest model
                    |> viewBody model
                ]
            ]

    else
        emptyHtml


viewHeader : { a | fullscreen : Bool } -> Html Msg
viewHeader { fullscreen } =
    div
        [ HA.class "modal-header" ]
        [ div
            [ HA.class "modal-title" ]
            [ text "Manifest Info" ]
        , div
            [ HA.class "modal-actions" ]
            [ div
                [ HA.class "modal-close-action" ]
                [ viewButton
                    { label = ""
                    , icon = Icons.close
                    , onClickMsg = Just UserClickedCloseManifestInfo
                    , isFullscreen = fullscreen
                    }
                ]
            ]
        ]


viewBody : Model -> Maybe IIIFManifest -> Html Msg
viewBody model maybeManifest =
    let
        rows =
            Maybe.map (buildRows model) maybeManifest
                |> Maybe.withDefault [ ( "Manifest", text "Not loaded" ) ]

        logoBlock =
            viewMaybe (viewLogoBlock model.detectedLanguage) maybeManifest
    in
    div
        [ classList
            [ ( "modal-body", True )
            , ( "is-two-column", True )
            ]
        ]
        [ div
            [ HA.class "metadata-body" ]
            (List.map viewRow rows)
        , div
            [ HA.class "manifest-info-logo-wrap" ]
            [ logoBlock ]
        ]


viewRow : ( String, Html Msg ) -> Html Msg
viewRow ( labelText, valueNode ) =
    div
        [ HA.class "metadata-item" ]
        [ div [ HA.class "metadata-label" ] [ text labelText ]
        , div [ HA.class "metadata-value" ] [ valueNode ]
        ]


buildRows : Model -> IIIFManifest -> List ( String, Html Msg )
buildRows model manifest =
    let
        (IIIFManifest version innerManifest) =
            manifest

        manifestUrl =
            case model.resourceResponse of
                ResourceLoadedManifest _ ->
                    model.manifestUrl

                ResourceLoadedCollection collectionState ->
                    collectionState.selectedManifestId
                        |> Maybe.withDefault model.manifestUrl

                _ ->
                    model.manifestUrl

        iiifVersion =
            case version of
                IIIFV2 ->
                    "IIIF v2"

                IIIFV3 ->
                    "IIIF v3"

        viewingHintOrBehavior =
            viewingLayoutLabel innerManifest.viewingLayout

        viewingDirection =
            viewingDirectionLabel innerManifest.viewingDirection

        summaryText =
            innerManifest.summary
                |> Maybe.map (extractLabelFromLanguageMap model.detectedLanguage)
                |> Maybe.withDefault "None"

        canvasCount =
            toCanvases manifest
                |> List.length
                |> String.fromInt

        rangeCount =
            toRanges manifest
                |> Maybe.map List.length
                |> Maybe.withDefault 0
                |> String.fromInt
    in
    ( "Manifest URL"
    , a
        [ href manifestUrl
        , target "_blank"
        , rel "noopener noreferrer"
        ]
        [ text manifestUrl ]
    )
        :: (if List.isEmpty model.acceptHeaders then
                []

            else
                let
                    acceptHeaders =
                        String.join ", " model.acceptHeaders
                in
                [ ( "Accept Headers", text acceptHeaders ) ]
           )
        ++ [ ( "Detected User Language", text (languageLabel model.detectedLanguage) )
           , ( "IIIF Version", text iiifVersion )
           , ( "Viewing Hint / Behavior", text viewingHintOrBehavior )
           , ( "Viewing Direction", text viewingDirection )
           , ( "Summary"
             , if summaryText == "None" then
                text summaryText

               else
                div [] (HtmlRenderer.renderHtml summaryText)
             )
           , ( "Canvases", text canvasCount )
           , ( "Ranges", text rangeCount )
           ]


languageLabel : Language -> String
languageLabel language =
    case language of
        LanguageCode code ->
            code

        None ->
            "none"

        Default ->
            "default"


viewLogoBlock : Language -> IIIFManifest -> Html Msg
viewLogoBlock language manifest =
    let
        ( providerLogoImage, homepageLink ) =
            case toProvider manifest |> Maybe.andThen List.head of
                Just provider ->
                    ( providerLogo provider
                    , providerHomepage provider
                    )

                Nothing ->
                    ( Nothing
                    , toHomepage manifest |> Maybe.andThen List.head
                    )

        logoUrl =
            case providerLogoImage of
                Just logo ->
                    logoIiifUrl logo

                Nothing ->
                    toLogo manifest
                        |> Maybe.map (.id >> setImageUriSize (WidthOnlySize 256) >> createImageAddress)
    in
    if logoUrl /= Nothing || homepageLink /= Nothing then
        div []
            [ viewMaybe
                (\url ->
                    img
                        [ HA.class "manifest-info-logo"
                        , src url
                        , alt "Manifest logo"
                        ]
                        []
                )
                logoUrl
            , viewMaybe
                (\page ->
                    let
                        labelText =
                            extractLabelFromLanguageMap language page.label
                    in
                    a
                        [ href page.id
                        , target "_blank"
                        , rel "noopener noreferrer"
                        ]
                        [ text labelText ]
                )
                homepageLink
            ]

    else
        emptyHtml


providerLogo : Provider -> Maybe Logo
providerLogo provider =
    provider.logo
        |> Maybe.andThen List.head


logoIiifUrl : Logo -> Maybe String
logoIiifUrl logo =
    case logo.service |> Maybe.andThen List.head of
        Just service ->
            parseImageAddress service.id
                |> Maybe.map (setImageUriSize (WidthOnlySize 256) >> createImageAddress)

        Nothing ->
            Just logo.id


providerHomepage : Provider -> Maybe HomePage
providerHomepage provider =
    provider.homepage
        |> Maybe.andThen List.head


viewingDirectionLabel : ViewingDirection -> String
viewingDirectionLabel direction =
    case direction of
        LeftToRight ->
            "Left to Right"

        RightToLeft ->
            "Right to Left"

        TopToBottom ->
            "Top to Bottom"

        BottomToTop ->
            "Bottom to Top"


viewingLayoutLabel : ViewingLayout -> String
viewingLayoutLabel layout =
    case layout of
        LayoutV2 hint ->
            "Hint: " ++ viewingHintLabel hint

        LayoutV3 behaviors ->
            if List.isEmpty behaviors then
                "Behavior: None"

            else
                "Behavior: " ++ String.join ", " (List.map behaviorLabel behaviors)


viewingHintLabel : ViewingHint -> String
viewingHintLabel hint =
    case hint of
        PagedHint ->
            "Paged"

        IndividualsHint ->
            "Individuals"

        ContinuousHint ->
            "Continuous"

        MultiPartHint ->
            "Multi-part"

        NonPagedHint ->
            "Non-paged"

        TopHint ->
            "Top"

        FacingPagesHint ->
            "Facing pages"


behaviorLabel : Behavior -> String
behaviorLabel behavior =
    case behavior of
        AutoAdvanceBehavior ->
            "Auto-advance"

        NoAutoAdvanceBehavior ->
            "No auto-advance"

        RepeatBehavior ->
            "Repeat"

        NoRepeatBehavior ->
            "No repeat"

        UnorderedBehavior ->
            "Unordered"

        IndividualsBehavior ->
            "Individuals"

        ContinuousBehavior ->
            "Continuous"

        PagedBehavior ->
            "Paged"

        FacingPagesBehavior ->
            "Facing pages"

        NonPagedBehavior ->
            "Non-paged"

        MultiPartBehavior ->
            "Multi-part"

        TogetherBehavior ->
            "Together"

        SequenceBehavior ->
            "Sequence"

        ThumbnailNavBehavior ->
            "Thumbnail nav"

        NoNavBehavior ->
            "No nav"

        HiddenBehavior ->
            "Hidden"
