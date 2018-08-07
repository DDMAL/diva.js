import Diva from '../source/js/diva';
import IIIFv3Manifest from './manifests/iiifv3';
import IIIFv2Manifest from './manifests/iiifv2';


describe('IIIF Manifest Parsing', function ()
{   
    beforeEach(function ()
    {
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

        Diva.Events.unsubscribeAll();
    });

    it('can parse an IIIF v2 Manifest', function (done)
    {
        let diva = new Diva('diva-wrapper', {  // jshint ignore:line
            objectData: IIIFv2Manifest
        })
    });

    it('can parse an IIIF v3 Manifest', function (done)
    {
        let diva = new Diva('diva-wrapper', { // jshint ignore:line
            objectData: IIIFv3Manifest
        });
    });
});
