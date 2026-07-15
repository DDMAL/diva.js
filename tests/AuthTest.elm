module AuthTest exposing (tests)

import Auth
import Expect
import IIIF.Auth exposing (AccessProfile(..), RelatedService(..))
import Json.Encode as Encode
import Test exposing (Test, describe, test)


tests : Test
tests =
    describe "Elm authorization coordinator"
        [ test "resolves static anonymous sources without a request"
            (\_ ->
                let
                    ( _, effects ) =
                        Auth.init
                            |> Auth.registerSources [ source "static" True Auth.Unknown ]
                            |> Auth.update (Auth.Resolve "request-1" "static")
                in
                case effects of
                    [ Auth.Complete resolution ] ->
                        Expect.equal ( False, True ) ( resolution.credentialed, resolution.isStatic )

                    _ ->
                        Expect.fail "Expected one anonymous completion"
            )
        , test "isolates invalid source discovery"
            (\_ ->
                let
                    ( _, effects ) =
                        Auth.init
                            |> Auth.registerSources [ source "bad" False (Auth.Invalid "bad auth") ]
                            |> Auth.update (Auth.Resolve "request-1" "bad")
                in
                Expect.equal [ Auth.Fail "request-1" "bad auth" ] effects
            )
        , test "selects thumbnail CORS from the source authorization state"
            (\_ ->
                let
                    ( probing, effects ) =
                        Auth.update (Auth.Resolve "request-1" "protected") initial

                    discovery =
                        Auth.Discovered { probes = [ activeProbe ], unsupportedServiceTypes = [] }

                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "public" False Auth.Unknown
                                , source "protected" False discovery
                                ]

                    operationId =
                        case effects of
                            [ Auth.Fetch id _ _ _ ] ->
                                id

                            _ ->
                                "missing"

                    allowed =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":200}"

                    ( anonymous, _ ) =
                        Auth.update (Auth.HttpSucceeded operationId 200 allowed) probing
                in
                Expect.all
                    [ \_ -> Expect.equal (Just "anonymous") (Auth.thumbnailCrossOrigin "public" initial)
                    , \_ -> Expect.equal Nothing (Auth.thumbnailCrossOrigin "protected" initial)
                    , \_ -> Expect.equal (Just "anonymous") (Auth.thumbnailCrossOrigin "protected" anonymous)
                    ]
                    ()
            )
        , test "deduplicates an association shared by visible sources"
            (\_ ->
                let
                    discovery =
                        Auth.Discovered { probes = [ activeProbe ], unsupportedServiceTypes = [] }

                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "one" False discovery
                                , source "two" False discovery
                                ]

                    ( afterFirst, firstEffects ) =
                        Auth.update (Auth.Resolve "request-1" "one") initial
                in
                case firstEffects of
                    [ Auth.Fetch _ "https://auth.example/probe" Nothing False ] ->
                        let
                            ( _, secondEffects ) =
                                Auth.update (Auth.Resolve "request-2" "two") afterFirst
                        in
                        Expect.equal [] secondEffects

                    _ ->
                        Expect.fail "Expected exactly one anonymous probe"
            )
        , test "deduplicates DIAMM probe URLs that differ only by uri query"
            (\_ ->
                let
                    firstProbe =
                        { activeProbe | id = "https://auth.example/probe?uri=image-one" }

                    secondProbe =
                        { activeProbe | id = "https://auth.example/probe?uri=image-two#ignored" }

                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "one" False (Auth.Discovered { probes = [ firstProbe ], unsupportedServiceTypes = [] })
                                , source "two" False (Auth.Discovered { probes = [ secondProbe ], unsupportedServiceTypes = [] })
                                ]

                    ( afterFirst, firstEffects ) =
                        Auth.update (Auth.Resolve "request-1" "one") initial

                    ( _, secondEffects ) =
                        Auth.update (Auth.Resolve "request-2" "two") afterFirst
                in
                Expect.all
                    [ \_ -> Expect.equal [ Auth.Fetch "auth-http-0" firstProbe.id Nothing False ] firstEffects
                    , \_ -> Expect.equal [] secondEffects
                    ]
                    ()
            )
        , test "keeps families separate across probe origins, paths, access services, and token services"
            (\_ ->
                let
                    differentOrigin =
                        { activeProbe | id = "https://other-auth.example/probe?uri=two" }

                    differentPath =
                        { activeProbe | id = "https://auth.example/other-probe?uri=three" }

                    differentAccess =
                        mapAccess (\access -> { access | id = Just "https://auth.example/other-login" }) activeProbe

                    differentToken =
                        mapAccess
                            (\access ->
                                { access
                                    | services =
                                        List.map
                                            (\service ->
                                                case service of
                                                    RelatedTokenService token ->
                                                        RelatedTokenService { token | id = "https://auth.example/other-token" }

                                                    RelatedLogoutService logout ->
                                                        RelatedLogoutService logout
                                            )
                                            access.services
                                }
                            )
                            activeProbe

                    discoveries =
                        [ activeProbe, differentOrigin, differentPath, differentAccess, differentToken ]

                    initial =
                        Auth.init
                            |> Auth.registerSources
                                (List.indexedMap
                                    (\index probe -> source (String.fromInt index) False (Auth.Discovered { probes = [ probe ], unsupportedServiceTypes = [] }))
                                    discoveries
                                )

                    resolveOne index ( model, accumulatedEffects ) =
                        let
                            ( next, nextEffects ) =
                                Auth.update (Auth.Resolve ("request-" ++ String.fromInt index) (String.fromInt index)) model
                        in
                        ( next, accumulatedEffects ++ nextEffects )

                    ( _, effects ) =
                        List.range 0 4 |> List.foldl resolveOne ( initial, [] )
                in
                Expect.equal 5 (List.length effects)
            )
        , test "cancelling a shared DIAMM login fails every waiter"
            (\_ ->
                let
                    discovery uri =
                        Auth.Discovered
                            { probes = [ { activeProbe | id = "https://auth.example/probe?uri=" ++ uri } ]
                            , unsupportedServiceTypes = []
                            }

                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "one" False (discovery "one")
                                , source "two" False (discovery "two")
                                ]

                    ( probingOne, firstEffects ) =
                        Auth.update (Auth.Resolve "request-1" "one") initial

                    ( probing, _ ) =
                        Auth.update (Auth.Resolve "request-2" "two") probingOne

                    operationId =
                        case firstEffects of
                            [ Auth.Fetch id _ _ _ ] ->
                                id

                            _ ->
                                "missing"

                    denied =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":401}"

                    ( reading, _ ) =
                        Auth.update (Auth.HttpSucceeded operationId 200 denied) probing

                    ( prompting, _ ) =
                        Auth.update (Auth.StorageRead associationKey 1000 Nothing) reading

                    ( _, effects ) =
                        Auth.update Auth.UserCancelled prompting

                    failedRequests =
                        effects
                            |> List.filterMap
                                (\effect ->
                                    case effect of
                                        Auth.Fail requestId _ ->
                                            Just requestId

                                        _ ->
                                            Nothing
                                )
                            |> List.sort
                in
                Expect.equal [ "request-1", "request-2" ] failedRequests
            )
        , test "queues independent login families and advances every waiter in FIFO order"
            (\_ ->
                let
                    discovery probe uri =
                        Auth.Discovered
                            { probes = [ { probe | id = probe.id ++ "?uri=" ++ uri } ]
                            , unsupportedServiceTypes = []
                            }

                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "a-one" False (discovery activeProbe "a-one")
                                , source "a-two" False (discovery activeProbe "a-two")
                                , source "b-one" False (discovery secondActiveProbe "b-one")
                                , source "b-two" False (discovery secondActiveProbe "b-two")
                                ]

                    ( probingA, effectsA ) =
                        Auth.update (Auth.Resolve "request-a-one" "a-one") initial

                    ( probingBoth, effectsB ) =
                        Auth.update (Auth.Resolve "request-b-one" "b-one") probingAWaiter

                    operationId effects =
                        case effects of
                            [ Auth.Fetch id _ Nothing False ] ->
                                id

                            _ ->
                                "missing"

                    denied =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":401}"

                    ( probingAWaiter, effectsAWaiter ) =
                        Auth.update (Auth.Resolve "request-a-two" "a-two") probingA

                    ( probing, effectsBWaiter ) =
                        Auth.update (Auth.Resolve "request-b-two" "b-two") probingBoth

                    ( readingA, _ ) =
                        Auth.update (Auth.HttpSucceeded (operationId effectsA) 200 denied) probing

                    ( readingBoth, _ ) =
                        Auth.update (Auth.HttpSucceeded (operationId effectsB) 200 denied) readingA

                    ( promptingA, _ ) =
                        Auth.update (Auth.StorageRead associationKey 1000 Nothing) readingBoth

                    ( queuedB, _ ) =
                        Auth.update (Auth.StorageRead secondAssociationKey 1000 Nothing) promptingA

                    ( promptingB, cancelledAEffects ) =
                        Auth.update Auth.UserCancelled queuedB

                    ( finished, cancelledBEffects ) =
                        Auth.update Auth.UserCancelled promptingB

                    failedRequestIds effects =
                        effects
                            |> List.filterMap
                                (\effect ->
                                    case effect of
                                        Auth.Fail requestId _ ->
                                            Just requestId

                                        _ ->
                                            Nothing
                                )
                            |> List.sort
                in
                Expect.all
                    [ \_ -> Expect.equal [] effectsAWaiter
                    , \_ -> Expect.equal [] effectsBWaiter
                    , \_ -> Expect.equal (Just associationKey) (Auth.prompt queuedB |> Maybe.map .flowId)
                    , \_ -> Expect.equal (Just secondAssociationKey) (Auth.prompt promptingB |> Maybe.map .flowId)
                    , \_ -> Expect.equal [ "request-a-one", "request-a-two" ] (failedRequestIds cancelledAEffects)
                    , \_ -> Expect.equal [ "request-b-one", "request-b-two" ] (failedRequestIds cancelledBEffects)
                    , \_ -> Expect.equal Nothing (Auth.prompt finished)
                    ]
                    ()
            )
        , test "a queued family failure does not clear the active prompt"
            (\_ ->
                let
                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "a" False (Auth.Discovered { probes = [ activeProbe ], unsupportedServiceTypes = [] })
                                , source "b" False (Auth.Discovered { probes = [ secondActiveProbe ], unsupportedServiceTypes = [] })
                                ]

                    ( probingA, effectsA ) =
                        Auth.update (Auth.Resolve "request-a" "a") initial

                    ( probing, effectsB ) =
                        Auth.update (Auth.Resolve "request-b" "b") probingA

                    operationId effects =
                        case effects of
                            [ Auth.Fetch id _ Nothing False ] ->
                                id

                            _ ->
                                "missing"

                    denied =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":401}"

                    ( readingA, _ ) =
                        Auth.update (Auth.HttpSucceeded (operationId effectsA) 200 denied) probing

                    ( readingBoth, _ ) =
                        Auth.update (Auth.HttpSucceeded (operationId effectsB) 200 denied) readingA

                    ( promptingA, _ ) =
                        Auth.update (Auth.StorageRead associationKey 1000 Nothing) readingBoth

                    ( queuedB, _ ) =
                        Auth.update (Auth.StorageRead secondAssociationKey 1000 Nothing) promptingA

                    ( retriedB, _ ) =
                        Auth.update (Auth.TokenFailed secondAssociationKey "background failure") queuedB

                    ( failedB, _ ) =
                        Auth.update (Auth.TokenFailed secondAssociationKey "background failure") retriedB
                in
                Expect.all
                    [ \_ -> Expect.equal (Just associationKey) (Auth.prompt queuedB |> Maybe.map .flowId)
                    , \_ -> Expect.equal (Just associationKey) (Auth.prompt retriedB |> Maybe.map .flowId)
                    , \_ -> Expect.equal (Just associationKey) (Auth.prompt failedB |> Maybe.map .flowId)
                    ]
                    ()
            )
        , test "uses a non-expired cached token only on its probe"
            (\_ ->
                let
                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "one"
                                    False
                                    (Auth.Discovered { probes = [ activeProbe ], unsupportedServiceTypes = [] })
                                ]

                    ( probing, firstEffects ) =
                        Auth.update (Auth.Resolve "request-1" "one") initial

                    operationId =
                        case firstEffects of
                            [ Auth.Fetch id _ _ _ ] ->
                                id

                            _ ->
                                "missing"

                    denied =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":401}"

                    ( reading, _ ) =
                        Auth.update (Auth.HttpSucceeded operationId 200 denied) probing

                    cached =
                        Encode.object
                            [ ( "accessToken", Encode.string "secret" )
                            , ( "expiresAt", Encode.float 2000 )
                            ]

                    ( _, effects ) =
                        Auth.update (Auth.StorageRead associationKey 1000 (Just cached)) reading
                in
                case effects of
                    [ Auth.Fetch _ url (Just bearer) False ] ->
                        Expect.equal ( "https://auth.example/probe", "secret" ) ( url, bearer )

                    _ ->
                        Expect.fail "Expected a cached-token probe"
            )
        , test "reuses credentialed family state without another DIAMM probe"
            (\_ ->
                let
                    firstProbe =
                        { activeProbe | id = "https://auth.example/probe?uri=image-one" }

                    firstDiscovery =
                        Auth.Discovered { probes = [ firstProbe ], unsupportedServiceTypes = [] }

                    secondProbe =
                        { activeProbe | id = "https://auth.example/probe?uri=image-two" }

                    secondDiscovery =
                        Auth.Discovered { probes = [ secondProbe ], unsupportedServiceTypes = [] }

                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "one" False firstDiscovery
                                , source "two" False secondDiscovery
                                ]

                    ( probing, firstEffects ) =
                        Auth.update (Auth.Resolve "request-1" "one") initial

                    anonymousOperation =
                        case firstEffects of
                            [ Auth.Fetch id _ Nothing False ] ->
                                id

                            _ ->
                                "missing"

                    denied =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":401}"

                    ( reading, _ ) =
                        Auth.update (Auth.HttpSucceeded anonymousOperation 200 denied) probing

                    ( prompting, _ ) =
                        Auth.update (Auth.StorageRead associationKey 1000 Nothing) reading

                    ( popup, _ ) =
                        Auth.update (Auth.PopupOpened associationKey) prompting

                    ( tokenFrame, _ ) =
                        Auth.update (Auth.PopupClosed associationKey) popup

                    token =
                        Encode.object
                            [ ( "@context", Encode.string "http://iiif.io/api/auth/2/context.json" )
                            , ( "type", Encode.string "AuthAccessToken2" )
                            , ( "accessToken", Encode.string "secret" )
                            , ( "expiresIn", Encode.int 300 )
                            , ( "messageId", Encode.string (associationKey ++ "-1") )
                            ]

                    ( freshProbe, tokenEffects ) =
                        Auth.update (Auth.TokenMessage associationKey 1000 token) tokenFrame

                    allowed =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":200}"

                    freshOperation =
                        tokenEffects
                            |> List.filterMap
                                (\effect ->
                                    case effect of
                                        Auth.Fetch id _ (Just "secret") False ->
                                            Just id

                                        _ ->
                                            Nothing
                                )
                            |> List.head
                            |> Maybe.withDefault "missing"

                    ( authorized, _ ) =
                        Auth.update (Auth.HttpSucceeded freshOperation 200 allowed) freshProbe

                    ( _, secondEffects ) =
                        Auth.update (Auth.Resolve "request-2" "two") authorized
                in
                Expect.all
                    [ \_ -> Expect.equal True (Auth.sourceIsAuthorized "two" authorized)
                    , \_ -> Expect.equal (Just "use-credentials") (Auth.thumbnailCrossOrigin "two" authorized)
                    , \_ ->
                        case secondEffects of
                            [ Auth.Fetch _ "https://images.example/two/info.json" Nothing True ] ->
                                Expect.pass

                            _ ->
                                Expect.fail "Expected a direct credentialed info.json request"
                    ]
                    ()
            )
        , test "fetches tiled info JSON before resolving manifest-declared credentialed sources"
            (\_ ->
                let
                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "one"
                                    False
                                    (Auth.Discovered { probes = [ activeProbe ], unsupportedServiceTypes = [] })
                                ]

                    ( probing, firstEffects ) =
                        Auth.update (Auth.Resolve "request-1" "one") initial

                    anonymousOperation =
                        case firstEffects of
                            [ Auth.Fetch id _ Nothing False ] ->
                                id

                            _ ->
                                "missing"

                    denied =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":401}"

                    ( reading, _ ) =
                        Auth.update (Auth.HttpSucceeded anonymousOperation 200 denied) probing

                    ( prompting, _ ) =
                        Auth.update (Auth.StorageRead associationKey 1000 Nothing) reading

                    ( popup, _ ) =
                        Auth.update (Auth.PopupOpened associationKey) prompting

                    ( tokenFrame, _ ) =
                        Auth.update (Auth.PopupClosed associationKey) popup

                    token =
                        Encode.object
                            [ ( "@context", Encode.string "http://iiif.io/api/auth/2/context.json" )
                            , ( "type", Encode.string "AuthAccessToken2" )
                            , ( "accessToken", Encode.string "secret" )
                            , ( "expiresIn", Encode.int 300 )
                            , ( "messageId", Encode.string (associationKey ++ "-1") )
                            ]

                    ( freshProbe, tokenEffects ) =
                        Auth.update (Auth.TokenMessage associationKey 1000 token) tokenFrame

                    allowed =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":200}"

                    freshOperation =
                        tokenEffects
                            |> List.filterMap
                                (\effect ->
                                    case effect of
                                        Auth.Fetch id _ (Just "secret") False ->
                                            Just id

                                        _ ->
                                            Nothing
                                )
                            |> List.head
                            |> Maybe.withDefault "missing"

                    ( awaitingInfo, infoEffects ) =
                        Auth.update (Auth.HttpSucceeded freshOperation 200 allowed) freshProbe

                    infoOperation =
                        infoEffects
                            |> List.filterMap
                                (\effect ->
                                    case effect of
                                        Auth.Fetch id "https://images.example/one/info.json" Nothing True ->
                                            Just id

                                        _ ->
                                            Nothing
                                )
                            |> List.head
                            |> Maybe.withDefault "missing"

                    infoJson =
                        "{\"@context\":\"http://iiif.io/api/image/2/context.json\",\"@id\":\"https://images.example/one\",\"protocol\":\"http://iiif.io/api/image\",\"width\":100,\"height\":100,\"profile\":[\"http://iiif.io/api/image/2/level2.json\"]}"

                    ( _, completeEffects ) =
                        Auth.update (Auth.HttpSucceeded infoOperation 200 infoJson) awaitingInfo
                in
                Expect.all
                    [ \_ ->
                        case infoEffects of
                            [ Auth.CancelTokenFrame _, Auth.Fetch _ "https://images.example/one/info.json" Nothing True ] ->
                                Expect.pass

                            _ ->
                                Expect.fail "Expected info.json fetch before completion"
                    , \_ ->
                        case completeEffects of
                            [ Auth.Complete resolution ] ->
                                case resolution.infoJson of
                                    Just _ ->
                                        Expect.equal ( True, False ) ( resolution.credentialed, resolution.isStatic )

                                    Nothing ->
                                        Expect.fail "Expected info JSON in the resolution"

                            _ ->
                                Expect.fail "Expected credentialed completion with info JSON"
                    ]
                    ()
            )
        , test "cancels active transport when destroyed"
            (\_ ->
                let
                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "one"
                                    False
                                    (Auth.Discovered { probes = [ activeProbe ], unsupportedServiceTypes = [] })
                                ]

                    ( probing, firstEffects ) =
                        Auth.update (Auth.Resolve "request-1" "one") initial

                    operationId =
                        case firstEffects of
                            [ Auth.Fetch id _ _ _ ] ->
                                id

                            _ ->
                                "missing"

                    ( _, effects ) =
                        Auth.update Auth.Destroyed probing
                in
                Expect.equal
                    [ Auth.CancelFetch operationId, Auth.CancelTokenFrame associationKey ]
                    effects
            )
        , test "ignores late authorization responses after sources are replaced"
            (\_ ->
                let
                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "old"
                                    False
                                    (Auth.Discovered { probes = [ activeProbe ], unsupportedServiceTypes = [] })
                                ]

                    ( probing, firstEffects ) =
                        Auth.update (Auth.Resolve "request-old" "old") initial

                    operationId =
                        case firstEffects of
                            [ Auth.Fetch id _ _ _ ] ->
                                id

                            _ ->
                                "missing"

                    replaced =
                        Auth.registerSources [ source "new" False Auth.Unknown ] probing

                    allowed =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":200}"

                    ( afterLateResponse, effects ) =
                        Auth.update (Auth.HttpSucceeded operationId 200 allowed) replaced
                in
                Expect.all
                    [ \_ -> Expect.equal [] effects
                    , \_ -> Expect.equal Nothing (Auth.prompt afterLateResponse)
                    ]
                    ()
            )
        , test "accepts logout and removes the corresponding token and sources"
            (\_ ->
                let
                    discovery =
                        Auth.Discovered { probes = [ activeProbeWithLogout ], unsupportedServiceTypes = [] }

                    initial =
                        Auth.init
                            |> Auth.registerSources
                                [ source "one" False discovery
                                , source "two" False discovery
                                ]

                    ( probingOne, firstEffects ) =
                        Auth.update (Auth.Resolve "request-1" "one") initial

                    ( probing, _ ) =
                        Auth.update (Auth.Resolve "request-2" "two") probingOne

                    anonymousOperation =
                        case firstEffects of
                            [ Auth.Fetch id _ Nothing False ] ->
                                id

                            _ ->
                                "missing"

                    denied =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":401}"

                    ( reading, _ ) =
                        Auth.update (Auth.HttpSucceeded anonymousOperation 200 denied) probing

                    ( prompting, _ ) =
                        Auth.update (Auth.StorageRead associationKey 1000 Nothing) reading

                    ( popup, _ ) =
                        Auth.update (Auth.PopupOpened associationKey) prompting

                    ( tokenFrame, _ ) =
                        Auth.update (Auth.PopupClosed associationKey) popup

                    token =
                        Encode.object
                            [ ( "@context", Encode.string "http://iiif.io/api/auth/2/context.json" )
                            , ( "type", Encode.string "AuthAccessToken2" )
                            , ( "accessToken", Encode.string "secret" )
                            , ( "expiresIn", Encode.int 300 )
                            , ( "messageId", Encode.string (associationKey ++ "-1") )
                            ]

                    ( freshProbe, tokenEffects ) =
                        Auth.update (Auth.TokenMessage associationKey 1000 token) tokenFrame

                    allowed =
                        "{\"@context\":\"http://iiif.io/api/auth/2/context.json\",\"type\":\"AuthProbeResult2\",\"status\":200}"

                    freshOperation =
                        tokenEffects
                            |> List.filterMap
                                (\effect ->
                                    case effect of
                                        Auth.Fetch id _ (Just "secret") False ->
                                            Just id

                                        _ ->
                                            Nothing
                                )
                            |> List.head
                            |> Maybe.withDefault "missing"

                    ( authorized, _ ) =
                        Auth.update (Auth.HttpSucceeded freshOperation 200 allowed) freshProbe

                    actions =
                        Auth.logoutActions authorized
                in
                case actions of
                    [ action ] ->
                        let
                            ( loggedOut, effects ) =
                                Auth.update (Auth.LogoutOpened action.sessionId) authorized
                        in
                        Expect.all
                            [ \_ -> Expect.equal [] (Auth.logoutActions loggedOut)
                            , \_ ->
                                Expect.equal
                                    [ Auth.RemoveToken action.sessionId tokenCacheKey
                                    , Auth.InvalidateSources [ "one", "two" ]
                                    ]
                                    effects
                            ]
                            ()

                    _ ->
                        Expect.fail "Expected one deduplicated logout action"
            )
        ]


activeProbe : IIIF.Auth.ProbeService
activeProbe =
    { id = "https://auth.example/probe"
    , type_ = "AuthProbeService2"
    , services =
        [ { id = Just "https://auth.example/login"
          , type_ = "AuthAccessService2"
          , profile = Active
          , services =
                [ RelatedTokenService
                    { id = "https://auth.example/token"
                    , type_ = "AuthAccessTokenService2"
                    , errorHeading = Nothing
                    , errorNote = Nothing
                    }
                ]
          , label = Nothing
          , heading = Nothing
          , note = Nothing
          , confirmLabel = Nothing
          }
        ]
    , errorHeading = Nothing
    , errorNote = Nothing
    }


activeProbeWithLogout : IIIF.Auth.ProbeService
activeProbeWithLogout =
    { activeProbe
        | services =
            activeProbe.services
                |> List.map
                    (\access ->
                        { access
                            | services =
                                access.services
                                    ++ [ RelatedLogoutService
                                            { id = "https://auth.example/logout"
                                            , type_ = "AuthLogoutService2"
                                            , label = Nothing
                                            }
                                       ]
                        }
                    )
    }


associationKey : String
associationKey =
    "https://auth.example/probe|https://auth.example/login|https://auth.example/token"


mapAccess : (IIIF.Auth.AccessService -> IIIF.Auth.AccessService) -> IIIF.Auth.ProbeService -> IIIF.Auth.ProbeService
mapAccess change probe =
    { probe | services = List.map change probe.services }


secondActiveProbe : IIIF.Auth.ProbeService
secondActiveProbe =
    { activeProbe | id = "https://auth.example/other-probe" }


secondAssociationKey : String
secondAssociationKey =
    "https://auth.example/other-probe|https://auth.example/login|https://auth.example/token"


source : String -> Bool -> Auth.SourceAuth -> Auth.Source
source id isStatic auth =
    { id = id
    , url = "https://images.example/" ++ id ++ "/info.json"
    , isStatic = isStatic
    , auth = auth
    }


tokenCacheKey : String
tokenCacheKey =
    associationKey
