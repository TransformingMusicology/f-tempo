import {CurrentPageData} from "@/app/components/ftempo/LeftPane";

type ImageViewProps = {
    page: CurrentPageData;
}

const ImageView = (props: ImageViewProps) => {
    return <div><img src={`https://uk-dev-ftempo.rism.digital/img/jpg/${props.page.siglum}.jpg`} alt="x" style={{width: "100%"}} /></div>;
};

export default ImageView;
