import Diva from '../source/js/diva';

describe('Plugins', function ()
{
    beforeEach(function ()
    {
        // reset event subscription so only current test is subscribed
        Diva.Events.unsubscribeAll();

        // recreate diva instance
        let oldWrapper = document.getElementById('parent-wrapper');
        oldWrapper.parentNode.removeChild(oldWrapper);
        let newWrapper = document.createElement('div');
        newWrapper.id = 'parent-wrapper';
        newWrapper.setAttribute('style', 'width: 984px; height: 800px');
        let div = document.createElement('div');
        div.id = 'diva-wrapper';
        newWrapper.appendChild(div);
        document.body.appendChild(newWrapper);
    }); 

    //METADATA PLUGIN
    it('Metadata plugin is created when added as a Diva plugin', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            let icon = document.getElementsByClassName('diva-metadata-icon')[0];
            assert.isNotNull(icon, 'Metadata icon should exist');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            plugins: [Diva.MetadataPlugin]
        });
    });

    it('Metadata div can be opened and closed', function (done) 
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            let icon = document.getElementsByClassName('diva-metadata-icon')[0];

            assert.isNull(document.getElementById('metadataDiv'), 'Metadata div should not exist yet');

            icon.click();

            let div = document.getElementById('metadataDiv');
            assert.isNotNull(div, 'Metadata div should exist');

            icon.click();
            assert.strictEqual(div.style.display, 'none', 'Div should be hidden');

            icon.click(); 
            document.getElementById('closeMetadata').click();
            assert.strictEqual(div.style.display, 'none', 'Div should be hidden from close button');

            // trigger drag events
            icon.click();
            let e = new Event('mousedown');
            div.dispatchEvent(e);
            e = new Event('mousemove');
            document.dispatchEvent(e);
            e = new Event('mouseup');
            document.dispatchEvent(e);

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            plugins: [Diva.MetadataPlugin]
        });
    });

    // hard to test dragging the element with just javascript, skipping

    // DOWNLOAD PLUGIN
    it('Download plugin is created when added as a Diva plugin', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            let icon = document.getElementsByClassName('diva-download-icon')[0];
            assert.isNotNull(icon, 'Download icon should exist');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            plugins: [Diva.DownloadPlugin]
        });
    });

    it('Download icon can be clicked', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            let icon = document.getElementsByClassName('diva-download-icon')[0];
            icon.click();
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            plugins: [Diva.DownloadPlugin]
        });
    });

    // MANIPULATION PLUGIN
    it('Manipulation plugin is created when added as a Diva plugin', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            let icon = document.getElementsByClassName('diva-manipulation-icon')[0];
            assert.isNotNull(icon, 'Manipulation icon should exist');
            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            plugins: [Diva.ManipulationPlugin]
        });
    });

    it('Manipulation controls can be used', function (done)
    {
        Diva.Events.subscribe('ViewerDidLoad', function ()
        {
            let icon = document.getElementsByClassName('diva-manipulation-icon')[0];
            icon.click();

            let controls = document.getElementsByClassName('manipulation-tools')[0];
            assert.isNotNull(controls, 'Controls exist once icon is clicked');

            done();
        });

        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: 'https://images.simssa.ca/iiif/manuscripts/cdn-hsmu-m2149l4/manifest.json',
            plugins: [Diva.ManipulationPlugin]
        });
    });

    // hard to test dragging the sliders to manipulate the image with just javascript, skipping
});