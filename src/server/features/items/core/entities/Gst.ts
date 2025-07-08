 
export class Gst{
    constructor(public rate:number ){
    }

    static defaultGsts(): Gst[] {
        return [
            new Gst(0),
            new Gst(2),
            new Gst(5),
            new Gst(12),
            new Gst(18),
            new Gst(28)
        ];
    }
}

