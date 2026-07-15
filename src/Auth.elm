module Auth exposing
    ( Association
    , Effect(..)
    , Event(..)
    , FamilyState
    , Flow
    , LogoutAction
    , Model
    , Operation
    , PendingSource
    , Phase
    , Prompt
    , Resolution
    , Session
    , Source
    , SourceAuth(..)
    , init
    , logoutActions
    , prompt
    , registerSources
    , sourceIsAuthorized
    , thumbnailCrossOrigin
    , update
    )

import Dict exposing (Dict)
import IIIF.Auth as IIIFAuth exposing (AccessProfile(..), AuthDiscovery, RelatedService(..))
import IIIF.Language exposing (LanguageMap)
import Json.Decode as Decode exposing (Value)
import Set exposing (Set)
import Url


type alias Association =
    { key : String
    , probe : IIIFAuth.ProbeService
    , access : IIIFAuth.AccessService
    , token : IIIFAuth.AccessTokenService
    , logout : Maybe IIIFAuth.LogoutService
    }


type Effect
    = Fetch String String (Maybe String) Bool
    | CancelFetch String
    | ReadToken String String
    | WriteToken String String String Float
    | RemoveToken String String
    | StartTokenFrame String String String
    | CancelTokenFrame String
    | InvalidateSources (List String)
    | Complete Resolution
    | Fail String String


type Event
    = Resolve String String
    | Cancel String
    | HttpSucceeded String Int String
    | HttpFailed String String
    | StorageRead String Float (Maybe Value)
    | PopupOpened String
    | PopupBlocked String
    | PopupClosed String
    | TokenMessage String Float Value
    | TokenFailed String String
    | LogoutOpened String
    | LogoutBlocked String
    | LogoutClosed
    | UserCancelled
    | Destroyed


type FamilyState
    = AnonymousFamily
    | CredentialedFamily


type alias Flow =
    { association : Association
    , waiters : List String
    , attempts : Int
    , phase : Phase
    , promptError : Maybe String
    }


type alias LogoutAction =
    { sessionId : String
    , url : String
    , label : Maybe LanguageMap
    , error : Maybe String
    }


type alias Model =
    { sources : Dict String Source
    , pending : Dict String PendingSource
    , operations : Dict String Operation
    , flows : Dict String Flow
    , activePrompt : Maybe Prompt
    , activeInteractive : Maybe String
    , promptQueue : List String
    , sessions : Dict String Session
    , familyStates : Dict String FamilyState
    , nextOperation : Int
    , destroyed : Bool
    }


type Operation
    = InfoOperation String InfoPurpose
    | ProbeOperation String (Maybe String)


type alias PendingSource =
    { sourceId : String
    , infoJson : Maybe Value
    }


type Phase
    = ProbingAnonymous
    | ReadingCache
    | ProbingCached
    | AwaitingUser
    | AwaitingPopup
    | AwaitingToken
    | ProbingFresh


type alias Prompt =
    { flowId : String
    , accessUrl : String
    , heading : Maybe LanguageMap
    , note : Maybe LanguageMap
    , confirmLabel : Maybe LanguageMap
    , error : Maybe String
    }


type alias Resolution =
    { requestId : String
    , url : String
    , isStatic : Bool
    , credentialed : Bool
    , infoJson : Maybe Value
    }


type alias Session =
    { id : String
    , logout : IIIFAuth.LogoutService
    , familyKeys : Set String
    , sourceIds : Set String
    , error : Maybe String
    }


type alias Source =
    { id : String
    , url : String
    , isStatic : Bool
    , auth : SourceAuth
    }


type SourceAuth
    = Unknown
    | Discovered AuthDiscovery
    | Invalid String


init : Model
init =
    { sources = Dict.empty
    , pending = Dict.empty
    , operations = Dict.empty
    , flows = Dict.empty
    , activePrompt = Nothing
    , activeInteractive = Nothing
    , promptQueue = []
    , sessions = Dict.empty
    , familyStates = Dict.empty
    , nextOperation = 0
    , destroyed = False
    }


logoutActions : Model -> List LogoutAction
logoutActions model =
    model.sessions
        |> Dict.values
        |> List.map
            (\session ->
                { sessionId = session.id
                , url = session.logout.id
                , label = session.logout.label
                , error = session.error
                }
            )


prompt : Model -> Maybe Prompt
prompt model =
    model.activePrompt


registerSources : List Source -> Model -> Model
registerSources sources model =
    { model
        | sources = List.map (\source -> ( source.id, source )) sources |> Dict.fromList
        , pending = Dict.empty
        , operations = Dict.empty
        , flows = Dict.empty
        , activePrompt = Nothing
        , activeInteractive = Nothing
        , promptQueue = []
    }


sourceIsAuthorized : String -> Model -> Bool
sourceIsAuthorized sourceId model =
    Dict.get sourceId model.sources
        |> Maybe.andThen sourceFamilyKey
        |> Maybe.andThen (\key -> Dict.get key model.familyStates)
        |> Maybe.map ((==) CredentialedFamily)
        |> Maybe.withDefault False


thumbnailCrossOrigin : String -> Model -> Maybe String
thumbnailCrossOrigin sourceId model =
    case Dict.get sourceId model.sources of
        Just source ->
            if requiresAuthorization source.auth then
                sourceFamilyKey source
                    |> Maybe.andThen (\key -> Dict.get key model.familyStates)
                    |> Maybe.map
                        (\state ->
                            case state of
                                AnonymousFamily ->
                                    "anonymous"

                                CredentialedFamily ->
                                    "use-credentials"
                        )

            else
                Just "anonymous"

        Nothing ->
            Nothing


update : Event -> Model -> ( Model, List Effect )
update event model =
    if model.destroyed then
        ( model, [] )

    else
        case event of
            Resolve requestId sourceId ->
                resolve requestId sourceId model

            Cancel requestId ->
                cancelRequest requestId model

            HttpSucceeded operationId status body ->
                httpSucceeded operationId status body model

            HttpFailed operationId message ->
                operationFailed operationId message model

            StorageRead flowId now value ->
                storageRead flowId now value model

            PopupOpened flowId ->
                if model.activeInteractive == Just flowId then
                    updateFlow flowId
                        (\flow -> { flow | phase = AwaitingPopup })
                        { model | activePrompt = Nothing }
                        []

                else
                    ( model, [] )

            PopupBlocked flowId ->
                if model.activeInteractive == Just flowId then
                    retryOrFail flowId "The sign-in window was blocked. Allow popups and retry." model

                else
                    ( model, [] )

            PopupClosed flowId ->
                case ( model.activeInteractive, Dict.get flowId model.flows ) of
                    ( Just activeFlowId, Just flow ) ->
                        if activeFlowId /= flowId then
                            ( model, [] )

                        else
                            let
                                messageId =
                                    flowId ++ "-" ++ String.fromInt (flow.attempts + 1)
                            in
                            updateFlow flowId
                                (\current -> { current | phase = AwaitingToken })
                                model
                                [ StartTokenFrame flowId flow.association.token.id messageId ]

                    _ ->
                        ( model, [] )

            TokenMessage flowId now value ->
                tokenMessage flowId now value model

            TokenFailed flowId message ->
                retryOrFail flowId message model

            LogoutOpened sessionId ->
                logoutOpened sessionId model

            LogoutBlocked sessionId ->
                ( { model
                    | sessions =
                        Dict.update sessionId
                            (Maybe.map (\session -> { session | error = Just "The logout window was blocked. Allow popups and try again." }))
                            model.sessions
                  }
                , []
                )

            LogoutClosed ->
                ( model, [] )

            UserCancelled ->
                case model.activePrompt of
                    Just active ->
                        failFlow active.flowId "Authorization was cancelled." model

                    Nothing ->
                        ( model, [] )

            Destroyed ->
                let
                    effects =
                        (Dict.keys model.operations |> List.map CancelFetch)
                            ++ (Dict.keys model.flows |> List.map CancelTokenFrame)
                in
                ( { model
                    | destroyed = True
                    , operations = Dict.empty
                    , flows = Dict.empty
                    , pending = Dict.empty
                    , activePrompt = Nothing
                    , activeInteractive = Nothing
                    , promptQueue = []
                    , sessions = Dict.empty
                  }
                , effects
                )


activateNextQueued : Model -> Model
activateNextQueued model =
    case model.promptQueue of
        [] ->
            model

        nextFlowId :: remaining ->
            let
                withRemaining =
                    { model | promptQueue = remaining }
            in
            case Dict.get nextFlowId model.flows of
                Just flow ->
                    case flow.association.access.id of
                        Just _ ->
                            activatePrompt nextFlowId flow withRemaining

                        Nothing ->
                            activateNextQueued withRemaining

                Nothing ->
                    activateNextQueued withRemaining


activatePrompt : String -> Flow -> Model -> Model
activatePrompt flowId flow model =
    case flow.association.access.id of
        Just accessUrl ->
            { model
                | activeInteractive = Just flowId
                , activePrompt =
                    Just
                        { flowId = flowId
                        , accessUrl = accessUrl
                        , heading = flow.association.access.heading
                        , note = flow.association.access.note
                        , confirmLabel = flow.association.access.confirmLabel
                        , error = flow.promptError
                        }
                , promptQueue = List.filter ((/=) flowId) model.promptQueue
            }

        Nothing ->
            model


addEffects : List Effect -> ( Model, List Effect ) -> ( Model, List Effect )
addEffects effects ( model, existing ) =
    ( model, existing ++ effects )


allocateOperation : Operation -> Model -> ( String, Model )
allocateOperation operation model =
    let
        operationId =
            "auth-http-" ++ String.fromInt model.nextOperation
    in
    ( operationId
    , { model
        | nextOperation = model.nextOperation + 1
        , operations = Dict.insert operationId operation model.operations
      }
    )


appendUnique : String -> List String -> List String
appendUnique flowId queue =
    if List.member flowId queue then
        queue

    else
        queue ++ [ flowId ]


associationFromProbe : IIIFAuth.ProbeService -> Maybe Association
associationFromProbe probe =
    let
        hasUnsupportedAccess =
            List.any (\access -> access.profile /= Active) probe.services
    in
    if hasUnsupportedAccess then
        Nothing

    else
        let
            active =
                List.filter (\access -> access.profile == Active) probe.services |> List.head
        in
        active
            |> Maybe.andThen
                (\access ->
                    access.services
                        |> List.filterMap
                            (\service ->
                                case service of
                                    RelatedTokenService token ->
                                        Just token

                                    RelatedLogoutService _ ->
                                        Nothing
                            )
                        |> List.head
                        |> Maybe.map
                            (\token ->
                                { key = normalizedProbeUrl probe.id ++ "|" ++ Maybe.withDefault "" access.id ++ "|" ++ token.id
                                , probe = probe
                                , access = access
                                , token = token
                                , logout =
                                    access.services
                                        |> List.filterMap
                                            (\service ->
                                                case service of
                                                    RelatedTokenService _ ->
                                                        Nothing

                                                    RelatedLogoutService logout ->
                                                        Just logout
                                            )
                                        |> List.head
                                }
                            )
                )


beginAuthorization : String -> AuthDiscovery -> Maybe Value -> Model -> ( Model, List Effect )
beginAuthorization requestId discovery infoJson model =
    let
        withInfo =
            { model
                | pending =
                    Dict.update requestId
                        (Maybe.map (\pending -> { pending | infoJson = infoJson }))
                        model.pending
            }
    in
    case supportedAssociation discovery of
        Ok association ->
            case Dict.get association.key withInfo.familyStates of
                Just AnonymousFamily ->
                    completeKnownFamily requestId False withInfo

                Just CredentialedFamily ->
                    completeKnownFamily requestId True withInfo

                Nothing ->
                    case Dict.get association.key withInfo.flows of
                        Just flow ->
                            ( { withInfo | flows = Dict.insert association.key { flow | waiters = requestId :: flow.waiters } withInfo.flows }, [] )

                        Nothing ->
                            let
                                flow =
                                    { association = association
                                    , waiters = [ requestId ]
                                    , attempts = 0
                                    , phase = ProbingAnonymous
                                    , promptError = Nothing
                                    }

                                withFlow =
                                    { withInfo | flows = Dict.insert association.key flow withInfo.flows }

                                ( operationId, next ) =
                                    allocateOperation (ProbeOperation association.key Nothing) withFlow
                            in
                            ( next, [ Fetch operationId association.probe.id Nothing False ] )

        Err message ->
            completeFailure requestId message withInfo


type alias CachedToken =
    { accessToken : String
    , expiresAt : Maybe Float
    }


cachedTokenDecoder : Decode.Decoder CachedToken
cachedTokenDecoder =
    Decode.map2 CachedToken
        (Decode.field "accessToken" Decode.string)
        (Decode.oneOf
            [ Decode.field "expiresAt" Decode.float |> Decode.map Just
            , Decode.succeed Nothing
            ]
        )


cancelRequest : String -> Model -> ( Model, List Effect )
cancelRequest requestId model =
    let
        nextFlows =
            Dict.map (\_ flow -> { flow | waiters = List.filter ((/=) requestId) flow.waiters }) model.flows
                |> Dict.filter (\_ flow -> not (List.isEmpty flow.waiters))

        removedFlowIds =
            Dict.keys model.flows |> List.filter (\flowId -> not (Dict.member flowId nextFlows))

        operations =
            Dict.filter
                (\_ operation ->
                    case operation of
                        InfoOperation waiter _ ->
                            waiter == requestId

                        ProbeOperation flowId _ ->
                            List.member flowId removedFlowIds
                )
                model.operations

        withoutRemoved =
            { model
                | pending = Dict.remove requestId model.pending
                , operations = Dict.diff model.operations operations
                , flows = nextFlows
            }

        next =
            List.foldl releaseInteractive withoutRemoved removedFlowIds
    in
    ( next
    , (Dict.keys operations |> List.map CancelFetch)
        ++ List.map CancelTokenFrame removedFlowIds
    )


completeFailure : String -> String -> Model -> ( Model, List Effect )
completeFailure requestId message model =
    ( { model | pending = Dict.remove requestId model.pending }, [ Fail requestId message ] )


completeFlow : String -> Bool -> Model -> ( Model, List Effect )
completeFlow flowId credentialed model =
    case Dict.get flowId model.flows of
        Just flow ->
            let
                withFamilyState =
                    { model
                        | familyStates =
                            Dict.insert flow.association.key
                                (if credentialed then
                                    CredentialedFamily

                                 else
                                    AnonymousFamily
                                )
                                model.familyStates
                    }

                withSession =
                    if credentialed then
                        registerSession flow withFamilyState

                    else
                        withFamilyState

                cleared =
                    releaseInteractive flowId
                        { withSession | flows = Dict.remove flowId withSession.flows }

                completeOne requestId ( current, effects ) =
                    case Dict.get requestId current.pending of
                        Just pending ->
                            case Dict.get pending.sourceId current.sources of
                                Just source ->
                                    case ( source.isStatic, pending.infoJson ) of
                                        ( False, Nothing ) ->
                                            let
                                                ( next, nextEffects ) =
                                                    startResolvedInfoRequest requestId credentialed source current
                                            in
                                            ( next, effects ++ nextEffects )

                                        _ ->
                                            let
                                                ( next, nextEffects ) =
                                                    completeSource requestId credentialed Nothing current
                                            in
                                            ( next, effects ++ nextEffects )

                                Nothing ->
                                    ( current, effects )

                        Nothing ->
                            ( current, effects )
            in
            List.foldl completeOne ( cleared, [ CancelTokenFrame flowId ] ) flow.waiters

        Nothing ->
            ( model, [] )


completeKnownFamily : String -> Bool -> Model -> ( Model, List Effect )
completeKnownFamily requestId credentialed model =
    case Dict.get requestId model.pending of
        Just pending ->
            case Dict.get pending.sourceId model.sources of
                Just source ->
                    case ( source.isStatic, pending.infoJson ) of
                        ( False, Nothing ) ->
                            startResolvedInfoRequest requestId credentialed source model

                        _ ->
                            completeSource requestId credentialed Nothing model

                Nothing ->
                    ( model, [] )

        Nothing ->
            ( model, [] )


completeSource : String -> Bool -> Maybe Value -> Model -> ( Model, List Effect )
completeSource requestId credentialed infoJson model =
    case Dict.get requestId model.pending of
        Just pending ->
            case Dict.get pending.sourceId model.sources of
                Just source ->
                    ( { model | pending = Dict.remove requestId model.pending }
                    , [ Complete
                            { requestId = requestId
                            , url = source.url
                            , isStatic = source.isStatic
                            , credentialed = credentialed
                            , infoJson =
                                case infoJson of
                                    Just value ->
                                        Just value

                                    Nothing ->
                                        pending.infoJson
                            }
                      ]
                    )

                Nothing ->
                    ( model, [] )

        Nothing ->
            ( model, [] )


failFlow : String -> String -> Model -> ( Model, List Effect )
failFlow flowId message model =
    case Dict.get flowId model.flows of
        Just flow ->
            let
                cleared =
                    releaseInteractive flowId
                        { model | flows = Dict.remove flowId model.flows }

                failOne requestId ( current, effects ) =
                    let
                        ( next, nextEffects ) =
                            completeFailure requestId message current
                    in
                    ( next, effects ++ nextEffects )
            in
            List.foldl failOne ( cleared, [ CancelTokenFrame flowId ] ) flow.waiters

        Nothing ->
            ( model, [] )


handleInfo : String -> Int -> String -> Model -> ( Model, List Effect )
handleInfo requestId status body model =
    case Decode.decodeString Decode.value body of
        Ok raw ->
            case Decode.decodeValue IIIFAuth.authServicesDecoder raw of
                Ok discovery ->
                    if List.isEmpty discovery.probes && List.isEmpty discovery.unsupportedServiceTypes then
                        if status >= 200 && status < 300 then
                            completeSource requestId False (Just raw) model

                        else
                            completeFailure requestId ("Image information request failed (" ++ String.fromInt status ++ ").") model

                    else
                        beginAuthorization requestId discovery (Just raw) model

                Err error ->
                    completeFailure requestId (Decode.errorToString error) model

        Err error ->
            completeFailure requestId (Decode.errorToString error) model


handleProbe : String -> Maybe String -> String -> Model -> ( Model, List Effect )
handleProbe flowId token body model =
    case Decode.decodeString IIIFAuth.probeResultDecoder body of
        Ok result ->
            if result.location /= Nothing || not (List.isEmpty result.substitutes) then
                failFlow flowId "IIIF Auth redirect, substitute, and tiered access flows are not supported." model

            else if result.status == 200 then
                completeFlow flowId (token /= Nothing) model

            else
                case Dict.get flowId model.flows of
                    Just flow ->
                        case flow.phase of
                            ProbingAnonymous ->
                                ( { model | flows = Dict.insert flowId { flow | phase = ReadingCache } model.flows }
                                , [ ReadToken flowId (tokenStorageKey flow.association) ]
                                )

                            ProbingCached ->
                                showPrompt flowId Nothing model
                                    |> addEffects [ RemoveToken flowId (tokenStorageKey flow.association) ]

                            ProbingFresh ->
                                retryOrFail flowId (probeError result.status) model
                                    |> addEffects [ RemoveToken flowId (tokenStorageKey flow.association) ]

                            _ ->
                                retryOrFail flowId (probeError result.status) model

                    Nothing ->
                        ( model, [] )

        Err error ->
            retryOrFail flowId (Decode.errorToString error) model


handleResolvedInfo : String -> Bool -> Int -> String -> Model -> ( Model, List Effect )
handleResolvedInfo requestId credentialed status body model =
    if status >= 200 && status < 300 then
        case Decode.decodeString Decode.value body of
            Ok raw ->
                completeSource requestId credentialed (Just raw) model

            Err error ->
                completeFailure requestId (Decode.errorToString error) model

    else
        completeFailure requestId ("Image information request failed (" ++ String.fromInt status ++ ").") model


httpSucceeded : String -> Int -> String -> Model -> ( Model, List Effect )
httpSucceeded operationId status body model =
    case Dict.get operationId model.operations of
        Just (InfoOperation requestId purpose) ->
            let
                next =
                    { model | operations = Dict.remove operationId model.operations }
            in
            case purpose of
                DiscoverInfo ->
                    handleInfo requestId status body next

                ResolveInfo credentialed ->
                    handleResolvedInfo requestId credentialed status body next

        Just (ProbeOperation flowId token) ->
            let
                next =
                    { model | operations = Dict.remove operationId model.operations }
            in
            handleProbe flowId token body next

        Nothing ->
            ( model, [] )


type InfoPurpose
    = DiscoverInfo
    | ResolveInfo Bool


logoutOpened : String -> Model -> ( Model, List Effect )
logoutOpened sessionId model =
    case Dict.get sessionId model.sessions of
        Just session ->
            let
                currentSourceIds =
                    sourceIdsForFamilyKeys session.familyKeys model.sources

                invalidatedSourceIds =
                    Set.union session.sourceIds currentSourceIds
                        |> Set.toList
            in
            ( { model
                | sessions = Dict.remove sessionId model.sessions
                , familyStates = Set.foldl Dict.remove model.familyStates session.familyKeys
              }
            , (session.familyKeys
                |> Set.toList
                |> List.map (RemoveToken sessionId)
              )
                ++ [ InvalidateSources invalidatedSourceIds ]
            )

        Nothing ->
            ( model, [] )


normalizedProbeUrl : String -> String
normalizedProbeUrl probeUrl =
    Url.fromString probeUrl
        |> Maybe.map (\parsed -> Url.toString { parsed | query = Nothing, fragment = Nothing })
        |> Maybe.withDefault probeUrl


operationFailed : String -> String -> Model -> ( Model, List Effect )
operationFailed operationId message model =
    case Dict.get operationId model.operations of
        Just (InfoOperation requestId _) ->
            completeFailure requestId message { model | operations = Dict.remove operationId model.operations }

        Just (ProbeOperation flowId _) ->
            retryOrFail flowId message { model | operations = Dict.remove operationId model.operations }

        Nothing ->
            ( model, [] )


probeError : Int -> String
probeError status =
    "Access was not granted (" ++ String.fromInt status ++ ")."


registerSession : Flow -> Model -> Model
registerSession flow model =
    case flow.association.logout of
        Just logout ->
            let
                sessionId =
                    Maybe.withDefault "" flow.association.access.id ++ "|" ++ flow.association.token.id ++ "|" ++ logout.id

                familyKey =
                    tokenStorageKey flow.association

                sourceIds =
                    flow.waiters
                        |> List.filterMap (\requestId -> Dict.get requestId model.pending |> Maybe.map .sourceId)
                        |> Set.fromList

                updateSession maybeSession =
                    case maybeSession of
                        Just session ->
                            Just
                                { session
                                    | familyKeys = Set.insert familyKey session.familyKeys
                                    , sourceIds = Set.union sourceIds session.sourceIds
                                    , error = Nothing
                                }

                        Nothing ->
                            Just
                                { id = sessionId
                                , logout = logout
                                , familyKeys = Set.singleton familyKey
                                , sourceIds = sourceIds
                                , error = Nothing
                                }
            in
            { model | sessions = Dict.update sessionId updateSession model.sessions }

        Nothing ->
            model


releaseInteractive : String -> Model -> Model
releaseInteractive flowId model =
    let
        withoutQueued =
            { model | promptQueue = List.filter ((/=) flowId) model.promptQueue }

        withoutPrompt =
            case withoutQueued.activePrompt of
                Just active ->
                    if active.flowId == flowId then
                        { withoutQueued | activePrompt = Nothing }

                    else
                        withoutQueued

                Nothing ->
                    withoutQueued
    in
    if withoutPrompt.activeInteractive == Just flowId then
        activateNextQueued { withoutPrompt | activeInteractive = Nothing }

    else
        withoutPrompt


requiresAuthorization : SourceAuth -> Bool
requiresAuthorization sourceAuth =
    case sourceAuth of
        Discovered discovery ->
            not (List.isEmpty discovery.probes)

        _ ->
            False


resolve : String -> String -> Model -> ( Model, List Effect )
resolve requestId sourceId model =
    case Dict.get sourceId model.sources of
        Just source ->
            let
                next =
                    { model | pending = Dict.insert requestId { sourceId = sourceId, infoJson = Nothing } model.pending }
            in
            case source.auth of
                Unknown ->
                    if source.isStatic then
                        completeSource requestId False Nothing next

                    else
                        startInfoRequest requestId source next

                Discovered discovery ->
                    if List.isEmpty discovery.probes then
                        if List.isEmpty discovery.unsupportedServiceTypes then
                            if source.isStatic then
                                completeSource requestId False Nothing next

                            else
                                startInfoRequest requestId source next

                        else
                            completeFailure requestId (unsupportedMessage discovery.unsupportedServiceTypes) next

                    else
                        beginAuthorization requestId discovery Nothing next

                Invalid message ->
                    completeFailure requestId message next

        Nothing ->
            ( model, [ Fail requestId "Unknown image source." ] )


retryOrFail : String -> String -> Model -> ( Model, List Effect )
retryOrFail flowId message model =
    case Dict.get flowId model.flows of
        Just flow ->
            if flow.attempts + 1 >= 2 then
                failFlow flowId message model

            else
                let
                    next =
                        { model | flows = Dict.insert flowId { flow | attempts = flow.attempts + 1 } model.flows }
                in
                showPrompt flowId (Just message) next
                    |> addEffects [ CancelTokenFrame flowId ]

        Nothing ->
            ( model, [] )


showPrompt : String -> Maybe String -> Model -> ( Model, List Effect )
showPrompt flowId error model =
    case Dict.get flowId model.flows of
        Just flow ->
            case flow.association.access.id of
                Just _ ->
                    let
                        updatedFlow =
                            { flow | phase = AwaitingUser, promptError = error }

                        withFlow =
                            { model | flows = Dict.insert flowId updatedFlow model.flows }
                    in
                    case model.activeInteractive of
                        Just activeFlowId ->
                            if activeFlowId == flowId then
                                ( activatePrompt flowId updatedFlow withFlow, [] )

                            else
                                ( { withFlow | promptQueue = appendUnique flowId withFlow.promptQueue }, [] )

                        Nothing ->
                            ( activatePrompt flowId updatedFlow withFlow, [] )

                Nothing ->
                    failFlow flowId "The active access service has no URL." model

        Nothing ->
            ( model, [] )


sourceFamilyKey : Source -> Maybe String
sourceFamilyKey source =
    case source.auth of
        Discovered discovery ->
            supportedAssociation discovery
                |> Result.toMaybe
                |> Maybe.map .key

        _ ->
            Nothing


sourceIdsForFamilyKeys : Set String -> Dict String Source -> Set String
sourceIdsForFamilyKeys familyKeys sources =
    sources
        |> Dict.values
        |> List.filterMap
            (\source ->
                sourceFamilyKey source
                    |> Maybe.andThen
                        (\familyKey ->
                            if Set.member familyKey familyKeys then
                                Just source.id

                            else
                                Nothing
                        )
            )
        |> Set.fromList


startInfoRequest : String -> Source -> Model -> ( Model, List Effect )
startInfoRequest requestId source model =
    let
        ( operationId, next ) =
            allocateOperation (InfoOperation requestId DiscoverInfo) model
    in
    ( next, [ Fetch operationId source.url Nothing False ] )


startResolvedInfoRequest : String -> Bool -> Source -> Model -> ( Model, List Effect )
startResolvedInfoRequest requestId credentialed source model =
    let
        ( operationId, next ) =
            allocateOperation (InfoOperation requestId (ResolveInfo credentialed)) model
    in
    ( next, [ Fetch operationId source.url Nothing credentialed ] )


storageRead : String -> Float -> Maybe Value -> Model -> ( Model, List Effect )
storageRead flowId now value model =
    case ( Dict.get flowId model.flows, value ) of
        ( Just flow, Just stored ) ->
            case Decode.decodeValue cachedTokenDecoder stored of
                Ok cached ->
                    if Maybe.map (\expiresAt -> now < expiresAt) cached.expiresAt |> Maybe.withDefault True then
                        let
                            ( operationId, withOperation ) =
                                allocateOperation (ProbeOperation flowId (Just cached.accessToken)) model
                        in
                        ( { withOperation | flows = Dict.insert flowId { flow | phase = ProbingCached } withOperation.flows }
                        , [ Fetch operationId flow.association.probe.id (Just cached.accessToken) False ]
                        )

                    else
                        showPrompt flowId Nothing model
                            |> addEffects [ RemoveToken flowId (tokenStorageKey flow.association) ]

                Err _ ->
                    showPrompt flowId Nothing model

        ( Just _, Nothing ) ->
            showPrompt flowId Nothing model

        _ ->
            ( model, [] )


supportedAssociation : AuthDiscovery -> Result String Association
supportedAssociation discovery =
    if not (List.isEmpty discovery.unsupportedServiceTypes) then
        Err (unsupportedMessage discovery.unsupportedServiceTypes)

    else
        case unsupportedPolicyError discovery.probes of
            Just message ->
                Err message

            Nothing ->
                discovery.probes
                    |> List.filterMap associationFromProbe
                    |> List.head
                    |> Result.fromMaybe "No supported Auth 2 active sign-in service was provided."


tokenMessage : String -> Float -> Value -> Model -> ( Model, List Effect )
tokenMessage flowId now value model =
    case Dict.get flowId model.flows of
        Just flow ->
            case Decode.decodeValue IIIFAuth.accessTokenDecoder value of
                Ok token ->
                    let
                        expiresAt =
                            now + toFloat (Maybe.withDefault 300 token.expiresIn) * 1000

                        ( operationId, withOperation ) =
                            allocateOperation (ProbeOperation flowId (Just token.accessToken)) model

                        next =
                            { withOperation | flows = Dict.insert flowId { flow | phase = ProbingFresh } withOperation.flows }
                    in
                    ( next
                    , [ WriteToken flowId (tokenStorageKey flow.association) token.accessToken expiresAt
                      , Fetch operationId flow.association.probe.id (Just token.accessToken) False
                      , CancelTokenFrame flowId
                      ]
                    )

                Err tokenDecodeError ->
                    case Decode.decodeValue IIIFAuth.tokenErrorDecoder value of
                        Ok _ ->
                            retryOrFail flowId "The token service refused access." model

                        Err _ ->
                            retryOrFail flowId (Decode.errorToString tokenDecodeError) model

        Nothing ->
            ( model, [] )


tokenStorageKey : Association -> String
tokenStorageKey association =
    association.key


unsupportedMessage : List String -> String
unsupportedMessage serviceTypes =
    "Unsupported authorization service: " ++ String.join ", " serviceTypes ++ "."


unsupportedPolicyError : List IIIFAuth.ProbeService -> Maybe String
unsupportedPolicyError probes =
    let
        accesses =
            List.concatMap .services probes
    in
    case List.filter (\access -> access.profile /= Active) accesses |> List.head of
        Just access ->
            Just
                ("IIIF Auth 2 '"
                    ++ (case access.profile of
                            Active ->
                                "active"

                            Kiosk ->
                                "kiosk"

                            External ->
                                "external"
                       )
                    ++ "' access is not supported; only the 'active' profile is supported."
                )

        Nothing ->
            Nothing


updateFlow : String -> (Flow -> Flow) -> Model -> List Effect -> ( Model, List Effect )
updateFlow flowId change model effects =
    ( { model | flows = Dict.update flowId (Maybe.map change) model.flows }, effects )
